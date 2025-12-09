import { Transaction, TransactionFormData, Account, Category, Property, Contract, Tenant } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_transactions';

// Helpers
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
  // Handle '2024-01-01 00:00:00' or '2024-01-01T00:00:00.000Z'
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
        // LEVEL 1: Full Query (Latest Schema)
        const rows = await db.query(`
          SELECT 
            t.code, t.date, t.description, t.amount, t.type, 
            t.category_code as "categoryCode", c.name as "categoryName",
            t.account_code as "accountCode", a.name as "accountName",
            t.property_code as "propertyCode", p.name as "propertyName",
            t.contract_code as "contractCode",
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
        console.warn("Level 1 Query failed (Schema Mismatch). Trying Level 2...", error.message);
        
        try {
            // LEVEL 2: Fallback (No Contracts/Tenants joins, but includes Loans/Transfers columns)
            const rows = await db.query(`
                SELECT 
                  t.code, t.date, t.description, t.amount, t.type, 
                  t.category_code as "categoryCode", c.name as "categoryName",
                  t.account_code as "accountCode", a.name as "accountName",
                  t.property_code as "propertyCode", p.name as "propertyName",
                  t.destination_account_code as "destinationAccountCode",
                  da.name as "destinationAccountName",
                  t.created_at as "createdAt",
                  t.loan_id as "loanId", t.loan_code as "loanCode", t.payment_number as "paymentNumber"
                FROM transactions t
                LEFT JOIN categories c ON t.category_code = c.code
                LEFT JOIN accounts a ON t.account_code = a.code
                LEFT JOIN accounts da ON t.destination_account_code = da.code
                LEFT JOIN properties p ON t.property_code = p.code
                ORDER BY t.date DESC, t.created_at DESC
            `);
            return rows.map(normalizeRow);
        } catch (error2: any) {
            console.warn("Level 2 Query failed. Trying Level 3 (Bare Minimum)...", error2.message);
            
            try {
                // LEVEL 3: Bare Minimum (Core columns only - Guaranteed to exist)
                const rows = await db.query(`
                    SELECT 
                      t.code, t.date, t.description, t.amount, t.type, 
                      t.category_code as "categoryCode", c.name as "categoryName",
                      t.account_code as "accountCode", a.name as "accountName",
                      t.property_code as "propertyCode", p.name as "propertyName"
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_code = c.code
                    LEFT JOIN accounts a ON t.account_code = a.code
                    LEFT JOIN properties p ON t.property_code = p.code
                    ORDER BY t.date DESC
                `);
                return rows.map(normalizeRow);
            } catch (error3: any) {
                console.error("CRITICAL: All query attempts failed.", error3);
                return []; // Return empty array to prevent app crash
            }
        }
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
    if (db.isConfigured()) {
       const rows = await db.query('SELECT code FROM transactions');
       const existing = rows.map(r => ({ code: r.code } as Transaction));
       const newCode = generateNextCode(existing);
       
       // STRATEGY: Try Most Complete -> Fallback to Real Estate Safe -> Fallback to Basic
       
       try {
           // ATTEMPT 1: FULL INSERT (Includes Loan, Transfers, Tenant, Contract)
           await db.query(`
             INSERT INTO transactions (
               code, date, description, amount, type, category_code, account_code, 
               property_code, contract_code, tenant_code, destination_account_code, destination_account_name,
               loan_id, loan_code, payment_number
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           `, [
             newCode, data.date, data.description, data.amount, data.type, 
             data.categoryCode, data.accountCode, data.propertyCode || null, 
             data.contractCode || null, data.tenantCode || null,
             data.destinationAccountCode || null, null, 
             data.loanId || null, data.loanCode || null, data.paymentNumber || null
           ]);
       } catch (e: any) {
           console.warn("Full Insert failed, trying Real Estate safe insert...", e.message);
           
           try {
               // ATTEMPT 2: REAL ESTATE SAFE INSERT
               // Preserves Contract & Tenant info (Critical for Real Estate Module)
               // Drops Loan/DestinationAccount columns which might be missing in older schemas
               await db.query(`
                 INSERT INTO transactions (
                   code, date, description, amount, type, category_code, account_code, 
                   property_code, contract_code, tenant_code
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               `, [
                 newCode, data.date, data.description, data.amount, data.type, 
                 data.categoryCode, data.accountCode, data.propertyCode || null,
                 data.contractCode || null, data.tenantCode || null
               ]);
           } catch (e2: any) {
               console.warn("Real Estate Insert failed, trying basic insert...", e2.message);
               
               // ATTEMPT 3: BARE MINIMUM (Last Resort)
               await db.query(`
                 INSERT INTO transactions (
                   code, date, description, amount, type, category_code, account_code, property_code
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               `, [
                 newCode, data.date, data.description, data.amount, data.type, 
                 data.categoryCode, data.accountCode, data.propertyCode || null
               ]);
           }
       }
       
       return { 
           code: newCode, 
           ...data, 
           categoryName: '', accountName: '', // populated on refetch
           createdAt: new Date().toISOString() 
       };
    } else {
        await delay(300);
        const existing = await TransactionService.getAll();
        const newCode = generateNextCode(existing);
        const newTx: Transaction = {
            code: newCode,
            ...data,
            categoryName: '',
            accountName: '',
            createdAt: new Date().toISOString()
        };
        const updated = [newTx, ...existing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newTx;
    }
  },

  update: async (code: string, data: TransactionFormData): Promise<Transaction> => {
      if (db.isConfigured()) {
          await db.query(`
            UPDATE transactions 
            SET date=$1, description=$2, amount=$3, type=$4, category_code=$5, account_code=$6, property_code=$7
            WHERE code=$8
          `, [data.date, data.description, data.amount, data.type, data.categoryCode, data.accountCode, data.propertyCode, code]);
          return { code, ...data } as Transaction;
      } else {
          const existing = await TransactionService.getAll();
          const index = existing.findIndex(t => t.code === code);
          if (index !== -1) {
              existing[index] = { ...existing[index], ...data };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
              return existing[index];
          }
          throw new Error("Transaction not found");
      }
  },

  delete: async (code: string): Promise<void> => {
      if (db.isConfigured()) {
          await db.query('DELETE FROM transactions WHERE code=$1', [code]);
      } else {
          let existing = await TransactionService.getAll();
          existing = existing.filter(t => t.code !== code);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
  },

  deleteByCategory: async (categoryCode: string): Promise<number> => {
      console.log(`TransactionService: Deleting transactions with category '${categoryCode}'...`);
      if (db.isConfigured()) {
          try {
              const result = await db.query('DELETE FROM transactions WHERE category_code=$1 RETURNING code', [categoryCode]);
              console.log("TransactionService: DB Delete Result:", result);
              return result.length;
          } catch (e: any) {
              console.error("TransactionService: DB Delete Error:", e);
              throw new Error(`Error en base de datos: ${e.message}`);
          }
      } else {
          let existing = await TransactionService.getAll();
          const initialLen = existing.length;
          existing = existing.filter(t => t.categoryCode !== categoryCode);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
          console.log(`TransactionService: Local delete. Removed ${initialLen - existing.length} items.`);
          return initialLen - existing.length;
      }
  }
};