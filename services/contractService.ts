import { Contract, ContractFormData, PaymentFormData, BulkPaymentFormData, ContractPrice } from '../types';
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
    if (db.isConfigured()) {
      const currentContract = (await db.query(`SELECT amount, next_payment_date FROM contracts WHERE code=$1`, [code]))[0];
      
      let nextPay = data.nextPaymentDate;
      if (!nextPay) {
          nextPay = currentContract.next_payment_date ? toDateString(currentContract.next_payment_date) : data.startDate;
      }

      await db.query(`
        UPDATE contracts 
        SET apartment_code=$1, tenant_code=$2, start_date=$3, end_date=$4, amount=$5, payment_day=$6, next_payment_date=$8
        WHERE code=$7
      `, [data.apartmentCode, data.tenantCode, data.startDate, data.endDate, data.amount, data.paymentDay, code, nextPay]);
      
      return { code, ...data, nextPaymentDate: nextPay, status: 'ACTIVE', createdAt: new Date().toISOString() } as Contract;
    } else {
      await delay(200);
      const existingList = await ContractService.getAll();
      const index = existingList.findIndex(c => c.code === code);
      if (index === -1) throw new Error("Contract not found");
      
      let nextPay = data.nextPaymentDate;
      if (!nextPay) {
          nextPay = existingList[index].nextPaymentDate || data.startDate;
      }

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
            id: String(r.id), 
            amount: Number(r.amount),
            startDate: toDateString(r.startDate),
            endDate: r.endDate ? toDateString(r.endDate) : undefined
        }));
      } catch (e) {
          console.error(e);
          return [];
      }
    }
    return [];
  },

  addPriceHistory: async (contractCode: string, amount: number, startDate: string, endDate?: string): Promise<void> => {
      if (db.isConfigured()) {
          await db.query(`
            INSERT INTO contract_prices (contract_code, amount, start_date, end_date)
            VALUES ($1, $2, $3, $4)
          `, [contractCode, amount, startDate, endDate || null]);
          
          const today = new Date().toISOString().split('T')[0];
          const isStarted = startDate <= today;
          const isNotEnded = !endDate || today <= endDate;

          if (isStarted && isNotEnded) {
             await db.query(`UPDATE contracts SET amount=$1 WHERE code=$2`, [amount, contractCode]);
          }
      }
  },

  deletePriceHistory: async (id: string): Promise<void> => {
      if(db.isConfigured()) {
          // FIX: Detect if ID is a number string and cast it to integer for Postgres
          // This prevents "delete 0 rows" issue if DB expects int but receives string '5'
          const finalId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
          
          // Debug check
          console.log("Deleting history ID:", finalId, "Type:", typeof finalId);
          
          await db.query('DELETE FROM contract_prices WHERE id=$1', [finalId]);
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
    let cat = categories.find(c => c.code === 'CAT-INC-003');
    if (!cat) cat = categories.find(c => (c.name.toLowerCase().includes('alquiler') || c.name.toLowerCase().includes('renta')) && c.type === 'INGRESO');
    if (!cat) cat = categories.find(c => c.type === 'INGRESO');
    
    if (!cat) throw new Error("No hay categoría de Ingresos disponible.");

    let targetPeriod = data.billablePeriod;
    if (!targetPeriod && data.date) {
        targetPeriod = data.date.substring(0, 7);
    }

    await TransactionService.create({
       date: data.date,
       amount: data.amount,
       description: data.description,
       type: 'INGRESO',
       categoryCode: cat.code,
       categoryName: cat.name,
       accountCode: data.accountCode,
       propertyCode: propertyCode,
       propertyName: propertyName,
       contractCode: contract.code,
       billablePeriod: targetPeriod,
       tenantCode: contract.tenantCode
    });

    let totalPaidForPeriod = data.amount; 
    
    try {
        const freshTxs = await TransactionService.getAll();
        const periodTxs = freshTxs.filter(t => t.contractCode === contract.code && t.billablePeriod === targetPeriod && t.type === 'INGRESO');
        totalPaidForPeriod = periodTxs.reduce((sum, t) => sum + t.amount, 0);
    } catch (e) {
        console.error("Error calculating total paid for period", e);
    }

    if (totalPaidForPeriod >= (contract.amount - 0.01)) {
        // CORRECCIÓN: Cálculo seguro de fecha para evitar desbordamiento de mes (ej. 30 Nov -> 1 Dic)
        let currentNext = new Date(contract.nextPaymentDate || contract.startDate);
        currentNext = new Date(currentNext.valueOf() + currentNext.getTimezoneOffset() * 60000);
        
        let targetYear = currentNext.getFullYear();
        let targetMonth = currentNext.getMonth() + 1; // Siguiente mes
        
        // Manejo de cambio de año
        if (targetMonth > 11) {
            targetMonth = 0;
            targetYear++;
        }
        
        // Usar el DÍA DE CORTE configurado en el contrato como ancla
        const pDay = contract.paymentDay || 1;
        // Calcular último día del mes objetivo para no pasarnos
        const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const safeDay = Math.min(pDay, daysInTargetMonth);
        
        const nextDate = new Date(targetYear, targetMonth, safeDay);
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
    }
  },

  processBulkPayment: async (data: BulkPaymentFormData): Promise<void> => {
      const paymentsToProcess = data.items.filter(i => i.selected);
      if (paymentsToProcess.length === 0) return;
      
      for (const item of paymentsToProcess) {
          const historicalAmount = await ContractService.getPriceAtDate(data.contractCode, item.date);
          const finalAmount = historicalAmount > 0 ? historicalAmount : item.amount;

          const period = item.date.substring(0, 7); 

          await ContractService.registerPayment({
              contractCode: data.contractCode,
              accountCode: data.accountCode,
              amount: finalAmount, 
              date: item.date,
              billablePeriod: period,
              description: item.description
          });
      }
  }
};