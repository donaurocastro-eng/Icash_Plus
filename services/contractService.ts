import { Contract, ContractFormData, PaymentFormData, BulkPaymentFormData, ContractPrice, Transaction } from '../types';
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
  return String(val).split('T')[0];
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
    const nextPay = data.nextPaymentDate || data.startDate;

    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM contracts');
      const existing = rows.map(r => ({ code: r.code } as Contract));
      const newCode = generateNextCode(existing);
      
      await db.query(`
        INSERT INTO contracts (code, apartment_code, tenant_code, start_date, end_date, next_payment_date, amount, payment_day, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
      `, [newCode, data.apartmentCode, data.tenantCode, data.startDate, data.endDate, nextPay, data.amount, data.paymentDay]);

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
        nextPaymentDate: nextPay,
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
        nextPaymentDate: nextPay,
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
    const nextPay = data.nextPaymentDate || data.startDate;

    if (db.isConfigured()) {
      const currentContract = (await db.query(`SELECT amount FROM contracts WHERE code=$1`, [code]))[0];
      const oldAmount = Number(currentContract.amount);
      const newAmount = Number(data.amount);

      await db.query(`
        UPDATE contracts 
        SET apartment_code=$1, tenant_code=$2, start_date=$3, end_date=$4, amount=$5, payment_day=$6, next_payment_date=$8
        WHERE code=$7
      `, [data.apartmentCode, data.tenantCode, data.startDate, data.endDate, data.amount, data.paymentDay, code, nextPay]);
      
      if (oldAmount !== newAmount) {
          const today = new Date().toISOString().split('T')[0];
          try {
            await db.query(`
                UPDATE contract_prices 
                SET end_date = $1 
                WHERE contract_code = $2 AND end_date IS NULL
            `, [today, code]);
            
            await db.query(`
                INSERT INTO contract_prices (contract_code, amount, start_date)
                VALUES ($1, $2, $3)
            `, [code, newAmount, today]);
          } catch (e) { console.warn("Price history update failed", e); }
      }

      return { code, ...data, nextPaymentDate: nextPay, status: 'ACTIVE', createdAt: new Date().toISOString() } as Contract;
    } else {
      await delay(200);
      const existingList = await ContractService.getAll();
      const index = existingList.findIndex(c => c.code === code);
      if (index === -1) throw new Error("Contract not found");
      const updated = { ...existingList[index], ...data, nextPaymentDate: nextPay };
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
      // Simplified: Just return current amount if historical fails or not needed
      // Keeping basic implementation for compatibility
      if (!db.isConfigured()) {
          const contracts = await ContractService.getAll();
          const c = contracts.find(x => x.code === contractCode);
          return c ? c.amount : 0;
      }
      try {
          const rows = await db.query(`SELECT amount FROM contracts WHERE code=$1`, [contractCode]);
          return rows.length > 0 ? Number(rows[0].amount) : 0;
      } catch (e) {
          return 0;
      }
  },

  getPriceHistory: async (contractCode: string): Promise<ContractPrice[]> => {
    if (db.isConfigured()) {
      try {
        const rows = await db.query(`
            SELECT id, contract_code as "contractCode", amount, start_date as "startDate", end_date as "endDate"
            FROM contract_prices
            WHERE contract_code = $1
            ORDER BY start_date DESC
        `, [contractCode]);
        return rows.map(r => ({
            ...r,
            amount: Number(r.amount),
            startDate: toDateString(r.startDate),
            endDate: r.endDate ? toDateString(r.endDate) : undefined
        }));
      } catch (e) { return []; }
    }
    return [];
  },

  addPriceHistory: async (contractCode: string, amount: number, startDate: string): Promise<void> => {
      if (db.isConfigured()) {
          await db.query(`INSERT INTO contract_prices (contract_code, amount, start_date) VALUES ($1, $2, $3)`, [contractCode, amount, startDate]);
      }
  },

  deletePriceHistory: async (id: string): Promise<void> => {
      if(db.isConfigured()) {
          await db.query('DELETE FROM contract_prices WHERE id=$1', [id]);
      }
  },

  // --- SIMPLIFIED PAYMENT REGISTRATION ---
  registerPayment: async (data: PaymentFormData): Promise<void> => {
    const contracts = await ContractService.getAll();
    const contract = contracts.find(c => c.code === data.contractCode);
    if (!contract) throw new Error("Contrato no encontrado");

    // 1. Fetch Property Info
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

    // 2. Fetch Category (Income)
    const categories = await CategoryService.getAll();
    let cat = categories.find(c => c.code === 'CAT-INC-003'); // Renta code if exists
    if (!cat) cat = categories.find(c => c.type === 'INGRESO' && (c.name.toLowerCase().includes('alquiler') || c.name.toLowerCase().includes('renta')));
    if (!cat) cat = categories.find(c => c.type === 'INGRESO'); // Fallback
    
    // 3. Create Transaction
    await TransactionService.create({
        date: data.date,
        amount: data.amount,
        description: data.description,
        type: 'INGRESO',
        categoryCode: cat ? cat.code : '',
        categoryName: cat ? cat.name : 'Alquiler',
        accountCode: data.accountCode,
        propertyCode: propertyCode,
        propertyName: propertyName,
        contractCode: contract.code,
        billablePeriod: data.billablePeriod, // Optional: store if provided, but don't depend logic on it
        tenantCode: contract.tenantCode
    });

    // 4. Simple Date Advancement (Next Month)
    await ContractService.advanceContractDate(contract);
  },

  updateNextPaymentDate: async (code: string, dateStr: string) => {
      if (db.isConfigured()) {
          await db.query('UPDATE contracts SET next_payment_date=$1 WHERE code=$2', [dateStr, code]);
      } else {
          const data = localStorage.getItem(STORAGE_KEY);
          if (data) {
              const list = JSON.parse(data);
              const idx = list.findIndex((c:any) => c.code === code);
              if (idx !== -1) {
                  list[idx].nextPaymentDate = dateStr;
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
              }
          }
      }
  },

  advanceContractDate: async (contract: Contract) => {
      let nextDate = new Date(contract.nextPaymentDate || contract.startDate);
      // Adjust timezone
      nextDate = new Date(nextDate.valueOf() + nextDate.getTimezoneOffset() * 60000);
      
      // Simple logic: Add 1 month
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
      await ContractService.updateNextPaymentDate(contract.code, nextDateStr);
  },

  processBulkPayment: async (data: BulkPaymentFormData): Promise<void> => {
      const paymentsToProcess = data.items.filter(i => i.selected);
      if (paymentsToProcess.length === 0) return;
      
      // Bulk is just looping the simple registration
      for (const item of paymentsToProcess) {
          const period = item.date.substring(0, 7); 
          await ContractService.registerPayment({
              contractCode: data.contractCode,
              accountCode: data.accountCode,
              amount: item.amount, 
              date: item.date, 
              billablePeriod: period,
              description: item.description
          });
      }
  }
};