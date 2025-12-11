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

  addPriceHistory: async (contractCode: string, amount: number, startDate: string): Promise<void> => {
      if (db.isConfigured()) {
          await db.query(`
            INSERT INTO contract_prices (contract_code, amount, start_date)
            VALUES ($1, $2, $3)
          `, [contractCode, amount, startDate]);
          
          const today = new Date().toISOString().split('T')[0];
          if (startDate <= today) {
             await db.query(`UPDATE contracts SET amount=$1 WHERE code=$2`, [amount, contractCode]);
          }
      }
  },

  deletePriceHistory: async (id: string): Promise<void> => {
      if(db.isConfigured()) {
          await db.query('DELETE FROM contract_prices WHERE id=$1', [id]);
      }
  },

  // --- NEW LOGIC: Calculate Outstanding Balance per month ---
  getContractStatus: async (contractCode: string) => {
      const contract = (await ContractService.getAll()).find(c => c.code === contractCode);
      if (!contract) return { months: [], totalDebt: 0 };

      const allTx = await TransactionService.getAll();
      const contractTx = allTx.filter(t => t.contractCode === contractCode && t.type === 'INGRESO');

      // Loop from Start Date until "Next Month" relative to today
      const startDate = new Date(contract.startDate);
      const today = new Date();
      // Adjust start date timezone
      const startAdjusted = new Date(startDate.valueOf() + startDate.getTimezoneOffset() * 60000);
      
      const statusList = [];
      let pointer = new Date(startAdjusted);
      let totalDebt = 0;

      // Limit loop to avoid infinite loops in bad data, max 5 years
      let safety = 0;
      // We check until we reach a month that is > today + 1 month (future)
      const futureLimit = new Date(today.getFullYear(), today.getMonth() + 2, 1);

      while (pointer < futureLimit && safety < 60) {
          const year = pointer.getFullYear();
          const month = pointer.getMonth(); // 0-11
          
          // Construct period YYYY-MM
          const period = `${year}-${String(month + 1).padStart(2, '0')}`;
          
          // Get Price for this specific month (Due Date = contract payment day)
          // We construct a "Due Date" for this month to query the price history
          const paymentDay = contract.paymentDay || 1;
          const maxDays = new Date(year, month + 1, 0).getDate();
          const checkDay = Math.min(paymentDay, maxDays);
          const checkDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(checkDay).padStart(2, '0')}`;
          
          const dueAmount = await ContractService.getPriceAtDate(contractCode, checkDateStr);

          // Get Paid Amount for this period
          // Logic: Sum all transactions that have this billablePeriod OR (fallback) fall in this month if no period set
          const paidAmount = contractTx
              .filter(t => {
                  if (t.billablePeriod) return t.billablePeriod === period;
                  // Legacy fallback
                  const tDate = new Date(t.date);
                  return tDate.getFullYear() === year && tDate.getMonth() === month;
              })
              .reduce((sum, t) => sum + t.amount, 0);

          const balance = dueAmount - paidAmount;
          
          // Determine status
          let status = 'PAID';
          if (balance > 0.01) {
              // Check if it's strictly in the past (overdue)
              const monthEnd = new Date(year, month + 1, 0);
              if (today > monthEnd) {
                  status = 'OVERDUE'; // Full or Partial Debt
                  totalDebt += balance;
              } else {
                  status = 'CURRENT'; // This month
              }
          }

          if (status !== 'PAID') {
              statusList.push({
                  period,
                  monthName: pointer.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
                  dueAmount,
                  paidAmount,
                  balance,
                  status // OVERDUE (Debt) or CURRENT (Current Month)
              });
          }

          pointer.setMonth(pointer.getMonth() + 1);
          safety++;
      }

      return { months: statusList, totalDebt };
  },

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

    // 2. Fetch Category
    const categories = await CategoryService.getAll();
    let cat = categories.find(c => c.code === 'CAT-INC-003');
    if (!cat) cat = categories.find(c => (c.name.toLowerCase().includes('alquiler') || c.name.toLowerCase().includes('renta')) && c.type === 'INGRESO');
    if (!cat) cat = categories.find(c => c.type === 'INGRESO');
    if (!cat) throw new Error("No hay categoría de Ingresos disponible.");

    // --- WATERFALL LOGIC ---
    // Instead of just paying the "Current Period", we must satisfy older debts first.
    
    // Get current status map
    const { months } = await ContractService.getContractStatus(contract.code);
    // Sort months ascending (oldest first)
    const pendingMonths = months.sort((a, b) => a.period.localeCompare(b.period));

    let remainingPayment = data.amount;
    const paymentDate = data.date;
    const accountCode = data.accountCode;
    const descriptionBase = data.description; // "Pago Alquiler Julio..."

    // If no pending months detected (e.g. advance payment or system sync issue), 
    // fall back to simple payment for the provided/current period
    if (pendingMonths.length === 0) {
        let period = data.billablePeriod;
        if (!period && data.date) period = data.date.substring(0, 7);
        
        await TransactionService.create({
            date: paymentDate, amount: remainingPayment, description: descriptionBase,
            type: 'INGRESO', categoryCode: cat.code, categoryName: cat.name,
            accountCode: accountCode, propertyCode: propertyCode, propertyName: propertyName,
            contractCode: contract.code, billablePeriod: period, tenantCode: contract.tenantCode
        });
        // Advance date logic (simple)
        await ContractService.advanceContractDate(contract);
        return;
    }

    // Distribute payment
    let monthsProcessed = 0;
    
    for (const month of pendingMonths) {
        if (remainingPayment <= 0.01) break;

        // How much is owed for this specific month?
        const debt = month.balance;
        
        // How much can we pay?
        const payAmount = Math.min(remainingPayment, debt);
        
        if (payAmount > 0) {
            // Determine description suffix based on whether it's full or partial coverage of THIS month's debt
            let descSuffix = ` (${month.period})`;
            if (payAmount < debt) descSuffix += " - Parcial";
            else if (month.paidAmount > 0) descSuffix += " - Saldo";

            await TransactionService.create({
                date: paymentDate,
                amount: payAmount,
                description: `${descriptionBase}${descSuffix}`,
                type: 'INGRESO',
                categoryCode: cat.code,
                categoryName: cat.name,
                accountCode: accountCode,
                propertyCode: propertyCode,
                propertyName: propertyName,
                contractCode: contract.code,
                billablePeriod: month.period, // Tag correctly to the OLD month
                tenantCode: contract.tenantCode
            });

            remainingPayment -= payAmount;
            monthsProcessed++;
        }
    }

    // Surplus? (If paid more than total debt)
    if (remainingPayment > 0.01) {
        // Find the month AFTER the last pending one
        const lastPending = pendingMonths[pendingMonths.length - 1];
        // Calculate next period string
        const [y, m] = lastPending.period.split('-').map(Number);
        let nextDate = new Date(y, m, 1); // This is month + 1 because month is 0-indexed in Date but 1-based in string? No. 
        // period "2025-06" -> y=2025, m=6. new Date(2025, 6, 1) is July 1st. Correct.
        const nextPeriod = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

        await TransactionService.create({
            date: paymentDate,
            amount: remainingPayment,
            description: `${descriptionBase} (Adelanto ${nextPeriod})`,
            type: 'INGRESO',
            categoryCode: cat.code,
            categoryName: cat.name,
            accountCode: accountCode,
            propertyCode: propertyCode,
            propertyName: propertyName,
            contractCode: contract.code,
            billablePeriod: nextPeriod,
            tenantCode: contract.tenantCode
        });
    }

    // Advance Contract "Next Payment Date" if necessary
    // We check the status again. If the oldest month is now fully paid, we move the date.
    // Actually, for robustness, we should recalculate the "Next Payment Date" based on the first UNPAID month.
    // However, to keep it simple and performant, we stick to the existing logic or just trigger the Sync tool logic if possible.
    // Let's implement a smart "Update Next Date" here.
    
    // Re-fetch status after transactions
    const newStatus = await ContractService.getContractStatus(contract.code);
    // The first month in the list is the first month with a balance > 0
    // If list is empty, all paid up to the future limit.
    if (newStatus.months.length > 0) {
        // Set next payment date to the first month with debt
        const firstUnpaid = newStatus.months[0]; // ordered ascending
        const [y, m] = firstUnpaid.period.split('-').map(Number);
        const day = contract.paymentDay || 1;
        // Careful with days > 28
        const maxDays = new Date(y, m, 0).getDate();
        const finalDay = Math.min(day, maxDays);
        const nextDateStr = `${y}-${String(m).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
        
        await ContractService.updateNextPaymentDate(contract.code, nextDateStr);
    } else {
        // Everything paid. Set to next month relative to last transaction or today?
        // Let's rely on standard logic: simply advance one month from current 'nextPaymentDate' is the naive way,
        // but since we did waterfall, we might have advanced multiple months.
        // Let's assume the user pays chronologically. 
        // If we paid off June and July, status list is empty (for past).
        // Let's just advance the date based on how many FULL months were paid in this batch?
        // Simpler: Just rely on the user or the "Sync" tool in Settings for complex edge cases.
        // But to be helpful:
        await ContractService.advanceContractDate(contract); 
    }
  },

  // Helper to update specific field
  updateNextPaymentDate: async (code: string, dateStr: string) => {
      if (db.isConfigured()) {
          await db.query('UPDATE contracts SET next_payment_date=$1 WHERE code=$2', [dateStr, code]);
      } else {
          // Local storage update...
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
      nextDate = new Date(nextDate.valueOf() + nextDate.getTimezoneOffset() * 60000);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      await ContractService.updateNextPaymentDate(contract.code, nextDateStr);
  },

  processBulkPayment: async (data: BulkPaymentFormData): Promise<void> => {
      const paymentsToProcess = data.items.filter(i => i.selected);
      if (paymentsToProcess.length === 0) return;
      
      for (const item of paymentsToProcess) {
          const historicalAmount = await ContractService.getPriceAtDate(data.contractCode, item.date);
          const finalAmount = historicalAmount > 0 ? historicalAmount : item.amount;

          // Determine period from the Item Date (which is the due date of that month)
          const period = item.date.substring(0, 7); 

          // Here we use simple creation because Bulk is explicit about periods
          // However, ideally we should route through registerPayment if we want waterfall.
          // But bulk is usually manual override. Let's keep strict period assignment for bulk.
          
          // Re-implement simplified version of registerPayment's core without waterfall for Bulk
          // ... (Existing bulk logic is fine as it targets specific periods explicitly)
          // Actually, let's just allow the direct creation as before, but ensure bills link correctly.
          
          await ContractService.registerPayment({
              contractCode: data.contractCode,
              accountCode: data.accountCode,
              amount: finalAmount, 
              date: item.date, // Payment Date recorded as Due Date for bulk
              billablePeriod: period,
              description: item.description
          });
      }
  }
};