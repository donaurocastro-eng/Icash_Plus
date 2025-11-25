import { Contract, ContractFormData, PaymentFormData, BulkPaymentFormData } from '../types';
import { db } from './db';
import { ApartmentService } from './apartmentService';
import { TransactionService } from './transactionService';
import { CategoryService } from './categoryService';
import { PropertyService } from './propertyService';

const STORAGE_KEY = 'icash_plus_contracts';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Contract[]): string => {
  let maxId = 0;
  existing.forEach(c => {
    if (c.code.startsWith('CTR-')) {
      const parts = c.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `CTR-${nextId.toString().padStart(3, '0')}`;
};

const toDateString = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
};

export const ContractService = {
  getAll: async (): Promise<Contract[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT code, 
               apartment_code as "apartmentCode", 
               property_code as "propertyCode", 
               tenant_code as "tenantCode", 
               start_date as "startDate", 
               end_date as "endDate", 
               next_payment_date as "nextPaymentDate",
               amount, 
               payment_day as "paymentDay",
               status, 
               created_at as "createdAt"
        FROM contracts ORDER BY created_at DESC
      `);
      return rows.map(r => ({
        ...r, 
        amount: Number(r.amount), 
        paymentDay: Number(r.paymentDay),
        startDate: toDateString(r.startDate),
        endDate: toDateString(r.endDate),
        nextPaymentDate: r.nextPaymentDate ? toDateString(r.nextPaymentDate) : toDateString(r.startDate)
      }));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: ContractFormData): Promise<Contract> => {
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM contracts');
      const existing = rows.map(r => ({ code: r.code } as Contract));
      const newCode = generateNextCode(existing);
      
      await db.query(`
        INSERT INTO contracts (code, apartment_code, tenant_code, start_date, end_date, next_payment_date, amount, payment_day, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
      `, [newCode, data.apartmentCode, data.tenantCode, data.startDate, data.endDate, data.startDate, data.amount, data.paymentDay]);

      try {
         await db.query(`UPDATE apartments SET status='RENTED' WHERE code=$1`, [data.apartmentCode]);
      } catch (e) { console.warn("Could not auto-update apartment status"); }

      return { 
        code: newCode, 
        ...data, 
        nextPaymentDate: data.startDate,
        status: 'ACTIVE', 
        createdAt: new Date().toISOString() 
      };
    } else {
      await delay(300);
      const existing = await ContractService.getAll();
      const newCode = generateNextCode(existing);
      const newContract: Contract = {
        code: newCode,
        apartmentCode: data.apartmentCode,
        tenantCode: data.tenantCode,
        startDate: data.startDate,
        endDate: data.endDate,
        nextPaymentDate: data.startDate,
        amount: data.amount,
        paymentDay: data.paymentDay,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newContract];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newContract;
    }
  },

  update: async (code: string, data: ContractFormData): Promise<Contract> => {
    const existingList = await ContractService.getAll();
    const current = existingList.find(c => c.code === code);
    const nextPaymentDate = current ? current.nextPaymentDate : data.startDate;

    if (db.isConfigured()) {
      await db.query(`
        UPDATE contracts 
        SET apartment_code=$1, tenant_code=$2, start_date=$3, end_date=$4, amount=$5, payment_day=$6
        WHERE code=$7
      `, [data.apartmentCode, data.tenantCode, data.startDate, data.endDate, data.amount, data.paymentDay, code]);
      
      return { 
        code, 
        ...data, 
        nextPaymentDate,
        status: 'ACTIVE', 
        createdAt: new Date().toISOString() 
      } as Contract;
    } else {
      await delay(200);
      const index = existingList.findIndex(c => c.code === code);
      if (index === -1) throw new Error("Contract not found");
      const updated = { ...existingList[index], ...data };
      existingList[index] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingList));
      return existingList[index];
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM contracts WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await ContractService.getAll();
      existing = existing.filter(c => c.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  },

  registerPayment: async (data: PaymentFormData): Promise<void> => {
    const contracts = await ContractService.getAll();
    const contract = contracts.find(c => c.code === data.contractCode);
    if (!contract) throw new Error("Contrato no encontrado");

    let propertyName = '';
    let propertyCode = contract.propertyCode;

    if (!propertyCode && contract.apartmentCode) {
        try {
            const apartments = await ApartmentService.getAll();
            const apt = apartments.find(a => a.code === contract.apartmentCode);
            if (apt) propertyCode = apt.propertyCode;
        } catch(e) { console.error(e); }
    }

    if (propertyCode) {
       try {
           const properties = await PropertyService.getAll();
           const p = properties.find(prop => prop.code === propertyCode);
           if (p) propertyName = p.name;
       } catch(e) { console.error(e); }
    }

    const categories = await CategoryService.getAll();
    let cat = categories.find(c => (c.name.toLowerCase().includes('alquiler') || c.name.toLowerCase().includes('renta')) && c.type === 'INGRESO');
    if (!cat) cat = categories.find(c => c.type === 'INGRESO');
    if (!cat) throw new Error("No hay categoría de Ingresos disponible.");

    await TransactionService.create({
       date: data.date,
       amount: data.amount,
       description: data.description,
       type: 'INGRESO',
       categoryCode: cat.code,
       accountCode: data.accountCode,
       propertyCode: propertyCode,
       propertyName: propertyName
    });

    let nextDate = new Date(contract.nextPaymentDate || contract.startDate);
    if (isNaN(nextDate.getTime())) nextDate = new Date();
    // This is single payment logic, usually advances 1 month
    // BUT, if using registerPayment for specific date (like in history modal), we might need more logic.
    // Assuming this is "pay current due date".
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    if (db.isConfigured()) {
       await db.query('UPDATE contracts SET next_payment_date=$1 WHERE code=$2', [nextDateStr, contract.code]);
    } else {
       contract.nextPaymentDate = nextDateStr;
       const idx = contracts.findIndex(c => c.code === contract.code);
       if (idx !== -1) {
           contracts[idx] = contract;
           localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
       }
    }
  },

  processBulkPayment: async (data: BulkPaymentFormData): Promise<void> => {
      // Process selected items sequentially
      // 1. Find items that are selected
      const paymentsToProcess = data.items.filter(i => i.selected);
      if (paymentsToProcess.length === 0) return;

      // 2. For each item, register a payment (transaction + advance date)
      // Note: registerPayment automatically advances date by 1 month.
      // If we pay 3 months, we call it 3 times.
      // CAUTION: registerPayment advances from CURRENT next_payment_date.
      // If we pay Jan, Feb, Mar, we must ensure order.
      // The BulkPaymentModal should enforce sequential selection or we assume sequential.
      
      for (const item of paymentsToProcess) {
          await ContractService.registerPayment({
              contractCode: data.contractCode,
              accountCode: data.accountCode,
              amount: item.amount,
              date: new Date().toISOString().split('T')[0], // Payment date is today
              description: item.description // "Alquiler Enero 2025", etc.
          });
          // Introduce slight delay if needed for DB consistency or just await loop
      }
  }
};