import { Transaction, TransactionFormData, Account } from '../types';
import { AccountService } from './accountService';
import { CategoryService } from './categoryService';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_transactions';
const ACCOUNTS_KEY = 'icash_plus_accounts';

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

// Helper to safe convert DB dates to string YYYY-MM-DD
const toDateString = (val: any): string => {
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
};

// Local helper
const updateLocalAccountBalance = async (accountCode: string, amount: number, type: 'INGRESO' | 'GASTO', isReversal: boolean = false) => {
  const accountsData = localStorage.getItem(ACCOUNTS_KEY);
  if (!accountsData) return;
  let accounts: Account[] = JSON.parse(accountsData);
  const index = accounts.findIndex(a => a.code === accountCode);
  if (index !== -1) {
    let adjustment = amount;
    if (type === 'GASTO') adjustment = -amount;
    if (isReversal) adjustment = -adjustment;
    accounts[index].initialBalance += adjustment;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
};

export const TransactionService = {
  getAll: async (): Promise<Transaction[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT 
          code, date, description, amount, type,
          category_code as "categoryCode", category_name as "categoryName",
          account_code as "accountCode", account_name as "accountName",
          property_code as "propertyCode", property_name as "propertyName",
          created_at as "createdAt"
        FROM transactions
        ORDER BY date DESC, created_at DESC
      `);
      return rows.map(r => ({ 
        ...r, 
        amount: Number(r.amount),
        // Fix: Ensure date is string
        date: toDateString(r.date)
      }));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: TransactionFormData): Promise<Transaction> => {
    const categories = await CategoryService.getAll();
    const accounts = await AccountService.getAll();
    const category = categories.find(c => c.code === data.categoryCode);
    const account = accounts.find(a => a.code === data.accountCode);
    if (!category || !account) throw new Error("Datos inválidos");

    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM transactions');
      const existing = rows.map(r => ({ code: r.code } as Transaction));
      const newCode = generateNextCode(existing);

      // Simple Transaction simulation (ideally use BEGIN/COMMIT block with pool client)
      await db.query(`
        INSERT INTO transactions (
          code, date, description, amount, type,
          category_code, category_name,
          account_code, account_name,
          property_code, property_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        newCode, data.date, data.description, data.amount, data.type,
        category.code, category.name,
        account.code, account.name,
        data.propertyCode, data.propertyName
      ]);

      // Update Balance in DB
      let adjustment = data.amount;
      if (data.type === 'GASTO') adjustment = -adjustment;
      
      await db.query(`
        UPDATE accounts SET initial_balance = initial_balance + $1 WHERE code = $2
      `, [adjustment, account.code]);

      return {
        code: newCode,
        ...data,
        categoryName: category.name,
        accountName: account.name,
        createdAt: new Date().toISOString()
      } as Transaction;

    } else {
      await delay(300);
      const existing = await TransactionService.getAll();
      const newCode = generateNextCode(existing);
      const newTransaction: Transaction = {
        code: newCode,
        date: data.date,
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        categoryCode: category.code,
        categoryName: category.name,
        accountCode: account.code,
        accountName: account.name,
        propertyCode: data.propertyCode || '',
        propertyName: data.propertyName || '',
        createdAt: new Date().toISOString()
      };
      const updatedList = [newTransaction, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      await updateLocalAccountBalance(account.code, newTransaction.amount, newTransaction.type, false);
      return newTransaction;
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
       // Get Transaction to reverse balance
       const rows = await db.query('SELECT amount, type, account_code FROM transactions WHERE code=$1', [code]);
       if (rows.length === 0) return;
       const tx = rows[0];
       
       // Reverse Balance
       let adjustment = Number(tx.amount);
       if (tx.type === 'GASTO') adjustment = -adjustment;
       // Invert for deletion
       adjustment = -adjustment; 

       await db.query(`UPDATE accounts SET initial_balance = initial_balance + $1 WHERE code = $2`, [adjustment, tx.account_code]);
       await db.query('DELETE FROM transactions WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await TransactionService.getAll();
      const txToDelete = existing.find(t => t.code === code);
      if (!txToDelete) throw new Error("Transacción no encontrada");
      await updateLocalAccountBalance(txToDelete.accountCode, txToDelete.amount, txToDelete.type, true);
      existing = existing.filter(t => t.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};