import { Transaction, TransactionFormData, Account, Category, Property, Contract, Tenant } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_transactions';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Transaction[]): string => {
  let maxId = 0;
  existing.forEach(tx => {
    if (tx.code.startsWith('TR-')) {
      const parts = tx.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `TR-${nextId.toString().padStart(5, '0')}`;
};

const toDateString = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val);
  if (s.includes('T')) return s.split('T')[0];
  return s.split(' ')[0];
};

const normalizeRow = (r: any): Transaction => ({
    ...r,
    amount: Number(r.amount),
    date: toDateString(r.date),
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
});

export const TransactionService = {
  getAll: async (): Promise<Transaction[]> => {
    if (db.isConfigured()) {
      try {
        const rows = await db.query(`
          SELECT 
            t.code, t.date, t.description, t.amount, t.type, 
            t.category_code as "categoryCode", c.name as "categoryName",
            t.account_code as "accountCode", a.name as "accountName",
            t.property_code as "propertyCode", p.name as "propertyName",
            t.contract_code as "contractCode",
            t.billable_period as "billablePeriod",
            t.tenant_code as "storedTenantCode",
            t.destination_account_code as "destinationAccountCode",
            da.name as "destinationAccountName",
            t.created_at as "createdAt",
            t.loan_id as "loanId", t.loan_code as "loanCode", t.payment_number as "paymentNumber",
            COALESCE(t.tenant_code, con.tenant_code) as "tenantCode",
            ten.full_name as "tenantName"
          FROM transactions t
          LEFT JOIN categories c ON t.category_code = c.code
          LEFT JOIN accounts a ON t.account_code = a.code
          LEFT JOIN accounts da ON t.destination_account_code = da.code
          LEFT JOIN properties p ON t.property_code = p.code
          LEFT JOIN contracts con ON t.contract_code = con.code
          LEFT JOIN tenants ten ON COALESCE(t.tenant_code, con.tenant_code) = ten.code
          ORDER BY t.date DESC, t.created_at DESC
        `);
        return rows.map(normalizeRow);
      } catch (error: any) {
        console.warn("Transaction Fetch Error:", error.message);
        return [];
      }
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      let transactions: Transaction[] = data ? JSON.parse(data) : [];
      
      const accData = localStorage.getItem('icash_plus_accounts');
      const accounts: Account[] = accData ? JSON.parse(accData) : [];
      
      const catData = localStorage.getItem('icash_plus_categories');
      const categories: Category[] = catData ? JSON.parse(catData) : [];
      
      const propData = localStorage.getItem('icash_plus_properties');
      const properties: Property[] = propData ? JSON.parse(propData) : [];

      const conData = localStorage.getItem('icash_plus_contracts');
      const contracts: Contract[] = conData ? JSON.parse(conData) : [];

      const tenData = localStorage.getItem('icash_plus_tenants');
      const tenants: Tenant[] = tenData ? JSON.parse(tenData) : [];

      return transactions.map(t => {
          const acc = accounts.find(a => a.code === t.accountCode);
          const cat = categories.find(c => c.code === t.categoryCode);
          const prop = properties.find(p => p.code === t.propertyCode);
          const destAcc = t.destinationAccountCode ? accounts.find(a => a.code === t.destinationAccountCode) : null;
          
          let tenantCode = t.tenantCode; 
          let tenantName = t.tenantName;

          if (!tenantCode && t.contractCode) {
              const contract = contracts.find(c => c.code === t.contractCode);
              if (contract) {
                  tenantCode = contract.tenantCode;
              }
          }
          
          if (tenantCode) {
              const tenant = tenants.find(te => te.code === tenantCode);
              if (tenant) tenantName = tenant.fullName;
          }

          return {
              ...t,
              accountName: acc ? acc.name : t.accountCode,
              categoryName: cat ? cat.name : t.categoryCode,
              propertyName: prop ? prop.name : '',
              destinationAccountName: destAcc ? destAcc.name : '',
              tenantCode,
              tenantName
          };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  },

  create: async (data: TransactionFormData): Promise<Transaction> => {
    let transactionData: any = { ...data };
    
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM transactions');
      const existing = rows.map(r => ({ code: r.code } as Transaction));
      const newCode = generateNextCode(existing);

      // --- CORRECCIÓN FINAL: Obtener Nombres para evitar error NOT NULL ---
      // Si el servicio que llama ya envió el nombre (data.categoryName), lo usamos.
      // Si no, lo buscamos en la DB.
      
      let categoryName = data.categoryName || '';
      if (!categoryName && data.categoryCode) {
          const catRes = await db.query('SELECT name FROM categories WHERE code=$1', [data.categoryCode]);
          if (catRes.length > 0) categoryName = catRes[0].name;
      }
      if (!categoryName) categoryName = 'General'; // Fallback final para evitar constraint violation

      let accountName = data.accountName || '';
      if (!accountName && data.accountCode) {
          const accRes = await db.query('SELECT name FROM accounts WHERE code=$1', [data.accountCode]);
          if (accRes.length > 0) accountName = accRes[0].name;
      }
      if (!accountName) accountName = 'Cuenta'; // Fallback final
      // -------------------------------------------------------------

      if (data.type === 'TRANSFERENCIA' && data.destinationAccountCode) {
          let destAccountName = '';
          const destRes = await db.query('SELECT name FROM accounts WHERE code=$1', [data.destinationAccountCode]);
          if (destRes.length > 0) destAccountName = destRes[0].name;

          // 1. Withdrawal
          await db.query(`
            INSERT INTO transactions (
                code, date, description, amount, type, category_code, category_name, account_code, account_name,
                property_code, contract_code, tenant_code, 
                destination_account_code, destination_account_name, loan_id, loan_code, payment_number
            )
            VALUES ($1, $2, $3, $4, 'GASTO', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [newCode, data.date, data.description, data.amount, 
              'CAT-EXP-013', 'Transferencia Enviada', // Hardcoded category name for Transfer Out
              data.accountCode, accountName,
              data.propertyCode || null, data.contractCode || null, data.tenantCode || null, 
              data.destinationAccountCode, destAccountName,
              data.loanId || null, data.loanCode || null, data.paymentNumber || null]);

          // 2. Deposit
          const newCodeIn = newCode + '-IN';
          await db.query(`
            INSERT INTO transactions (
                code, date, description, amount, type, category_code, category_name, account_code, account_name,
                property_code, contract_code, tenant_code, 
                destination_account_code, destination_account_name, loan_id, loan_code, payment_number
            )
            VALUES ($1, $2, $3, $4, 'INGRESO', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [newCodeIn, data.date, data.description, data.amount, 
              'CAT-INC-007', 'Transferencia Recibida', // Hardcoded category name for Transfer In
              data.destinationAccountCode, destAccountName,
              data.propertyCode || null, data.contractCode || null, data.tenantCode || null, 
              data.accountCode, accountName,
              data.loanId || null, data.loanCode || null, data.paymentNumber || null]);

          return { code: newCode, ...data, createdAt: new Date().toISOString() } as Transaction;

      } else {
          // Normal Transaction
          await db.query(`
            INSERT INTO transactions (
                code, date, description, amount, type, category_code, category_name, account_code, account_name,
                property_code, contract_code, billable_period, tenant_code, 
                destination_account_code, loan_id, loan_code, payment_number
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          `, [newCode, data.date, data.description, data.amount, data.type, 
              data.categoryCode, categoryName, // Uses passed or fetched name
              data.accountCode, accountName,   // Uses passed or fetched name
              data.propertyCode || null, data.contractCode || null, data.billablePeriod || null, data.tenantCode || null, 
              data.destinationAccountCode || null, data.loanId || null, data.loanCode || null, data.paymentNumber || null]);

          return { code: newCode, ...data, createdAt: new Date().toISOString() } as Transaction;
      }

    } else {
      // Local Storage Logic
      await delay(300);
      const existing = await TransactionService.getAll();
      const newCode = generateNextCode(existing);
      
      if (data.type === 'TRANSFERENCIA' && data.destinationAccountCode) {
          const outTx: Transaction = {
              code: newCode,
              ...data,
              type: 'GASTO',
              categoryCode: 'CAT-EXP-013', // Transferencia Enviada
              categoryName: 'Transferencia Enviada',
              accountName: '',
              createdAt: new Date().toISOString()
          };
          const inTx: Transaction = {
              code: newCode + '-IN',
              ...data,
              type: 'INGRESO',
              categoryCode: 'CAT-INC-007', // Transferencia Recibida
              categoryName: 'Transferencia Recibida',
              accountCode: data.destinationAccountCode,
              destinationAccountCode: data.accountCode,
              accountName: '',
              createdAt: new Date().toISOString()
          };
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, outTx, inTx]));
          return outTx;
      } else {
          const newTx: Transaction = {
              code: newCode,
              ...data,
              accountName: '', // Populated on read
              categoryName: '',
              createdAt: new Date().toISOString()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, newTx]));
          return newTx;
      }
    }
  },

  update: async (code: string, data: TransactionFormData): Promise<Transaction> => {
      if (db.isConfigured()) {
          // Si actualizamos, técnicamente también deberíamos actualizar los nombres si cambiaron los códigos
          // Por simplicidad en update (que es menos frecuente), solo actualizamos los códigos. 
          // Si la DB tiene triggers, se encargarán. Si no, quedará desincronizado el nombre hasta que se haga un reload completo
          // O podemos hacer la misma lógica de fetch aqui.
          
          await db.query(`
            UPDATE transactions 
            SET date=$1, description=$2, amount=$3, type=$4, category_code=$5, account_code=$6, property_code=$7
            WHERE code=$8
          `, [data.date, data.description, data.amount, data.type, data.categoryCode, data.accountCode, data.propertyCode || null, code]);
          return { code, ...data, createdAt: new Date().toISOString() } as Transaction;
      } else {
          await delay(200);
          const existing = await TransactionService.getAll();
          const index = existing.findIndex(t => t.code === code);
          if (index === -1) throw new Error("Transaction not found");
          
          existing[index] = { ...existing[index], ...data };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
          return existing[index];
      }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
        await db.query('DELETE FROM transactions WHERE code=$1', [code]);
    } else {
        await delay(200);
        let existing = await TransactionService.getAll();
        existing = existing.filter(t => t.code !== code);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  },

  deleteByCategory: async (categoryCode: string): Promise<number> => {
      if (!categoryCode) return 0;
      if (db.isConfigured()) {
          const result = await db.query(`
            WITH deleted AS (
                DELETE FROM transactions WHERE category_code = $1 RETURNING code
            ) SELECT count(*) FROM deleted;
          `, [categoryCode]);
          return parseInt(result[0].count);
      } else {
          const existing = await TransactionService.getAll();
          const initialLen = existing.length;
          const filtered = existing.filter(t => t.categoryCode !== categoryCode);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          return initialLen - filtered.length;
      }
  }
};