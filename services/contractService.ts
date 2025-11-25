
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
        await db.query(`
            INSERT INTO contract_prices (contract_code, amount, start_date)
            VALUES ($1, $2, $3)
        `, [newCode, data.amount, data.startDate]);
      } catch (e) { console.warn("Could not init price history", e); }

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
    if (db.isConfigured()) {
      const currentContract = (await db.query(`SELECT amount FROM contracts WHERE code=$1`, [code]))[0];
      const oldAmount = Number(currentContract.amount);
      const newAmount = Number(data.amount);

      await db.query(`
        UPDATE contracts 
        SET apartment_code=$1, tenant_code=$2, start_date=$3, end_date=$4, amount=$5, payment_day=$6
        WHERE code=$7
      `, [data.apartmentCode, data.tenantCode, data.startDate, data.endDate, data.amount, data.paymentDay, code]);
      
      if (oldAmount !== newAmount) {
          const today = new Date().toISOString().split('T')[0];
          await db.query(`
            UPDATE contract_prices 
            SET end_date = $1 
            WHERE contract_code = $2 AND end_date IS NULL
          `, [today, code]);
          
          await db.query(`
            INSERT INTO contract_prices (contract_code, amount, start_date)
            VALUES ($1, $2, $3)
          `, [code, newAmount, today]);
      }

      return { code, ...data, nextPaymentDate: data.startDate, status: 'ACTIVE', createdAt: new Date().toISOString() } as Contract;
    } else {
      await delay(200);
      const existingList = await ContractService.getAll();
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

  getPriceAtDate: async (contractCode: string, dateStr: string): Promise<number> => {
      if (!db.isConfigured()) {
          const contracts = await ContractService.getAll();
          const c = contracts.find(x => x.code === contractCode);
          return c ? c.amount : 0;
      }

      try {
          const rows = await db.query(`
            SELECT amount FROM contract_prices
            WHERE contract_code = $1
            AND start_date <= $2
            AND (end_date >= $2 OR end_date IS NULL)
            ORDER BY start_date DESC
            LIMIT 1
          `, [contractCode, dateStr]);

          if (rows.length > 0) return Number(rows[0].amount);
          
          const cRows = await db.query(`SELECT amount FROM contracts WHERE code=$1`, [contractCode]);
          return cRows.length > 0 ? Number(cRows[0].amount) : 0;
      } catch (e) {
          console.error("Error fetching historical price", e);
          return 0;
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
      const paymentsToProcess = data.items.filter(i => i.selected);
      if (paymentsToProcess.length === 0) return;
      
      for (const item of paymentsToProcess) {
          const historicalAmount = await ContractService.getPriceAtDate(data.contractCode, item.date);
          const finalAmount = historicalAmount > 0 ? historicalAmount : item.amount;

          await ContractService.registerPayment({
              contractCode: data.contractCode,
              accountCode: data.accountCode,
              amount: finalAmount, 
              date: new Date().toISOString().split('T')[0], 
              description: item.description
          });
      }
  }
};
