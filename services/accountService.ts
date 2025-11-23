import { Account, AccountFormData } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_accounts';
const CASH_CODE = 'EFECTIVO-01';

const DEFAULT_ACCOUNTS: Account[] = [
  {
    code: CASH_CODE,
    name: 'Efectivo en Mano',
    bankName: 'Caja Fuerte / Billetera',
    accountNumber: 'N/A',
    type: 'ACTIVO',
    initialBalance: 0,
    currency: 'HNL',
    isSystem: true,
    createdAt: new Date().toISOString()
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existingAccounts: Account[]): string => {
  let maxId = 0;
  existingAccounts.forEach(acc => {
    if (acc.code.startsWith('CTA-')) {
      const parts = acc.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `CTA-${nextId.toString().padStart(3, '0')}`;
};

export const AccountService = {
  getAll: async (): Promise<Account[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT 
          code, 
          name, 
          bank_name as "bankName", 
          account_number as "accountNumber", 
          type, 
          initial_balance as "initialBalance", 
          currency, 
          is_system as "isSystem", 
          created_at as "createdAt" 
        FROM accounts
        ORDER BY created_at ASC
      `);
      // Convert numeric strings to numbers if needed (Postgres returns numeric as string)
      return rows.map(r => ({ ...r, initialBalance: Number(r.initialBalance) }));
    } else {
      // LOCAL FALLBACK
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      let accounts: Account[] = data ? JSON.parse(data) : [];
      if (!accounts.find(a => a.code === CASH_CODE)) {
        accounts = [...DEFAULT_ACCOUNTS, ...accounts];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      }
      return accounts;
    }
  },

  create: async (data: AccountFormData): Promise<Account> => {
    if (db.isConfigured()) {
      // For ID generation in SQL, we can do a quick select or use a sequence. 
      // To keep it consistent with the logic, let's fetch max code first.
      const rows = await db.query('SELECT code FROM accounts');
      const existing = rows.map(r => ({ code: r.code } as Account));
      const newCode = generateNextCode(existing);

      await db.query(`
        INSERT INTO accounts (code, name, bank_name, account_number, type, initial_balance, currency, is_system)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      `, [newCode, data.name, data.bankName, data.accountNumber, data.type, data.initialBalance, data.currency]);

      return {
        code: newCode,
        ...data,
        isSystem: false,
        createdAt: new Date().toISOString()
      };
    } else {
      // LOCAL FALLBACK
      await delay(300);
      const existingAccounts = await AccountService.getAll();
      const newCode = generateNextCode(existingAccounts);
      const newAccount: Account = {
        code: newCode,
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        type: data.type,
        initialBalance: Number(data.initialBalance),
        currency: data.currency,
        isSystem: false,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existingAccounts, newAccount];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newAccount;
    }
  },

  update: async (code: string, data: AccountFormData): Promise<Account> => {
    if (db.isConfigured()) {
      await db.query(`
        UPDATE accounts 
        SET name=$1, bank_name=$2, account_number=$3, type=$4, initial_balance=$5, currency=$6
        WHERE code=$7
      `, [data.name, data.bankName, data.accountNumber, data.type, data.initialBalance, data.currency, code]);
      
      return {
        code,
        ...data,
        isSystem: false, // assuming update doesn't change system status
        createdAt: new Date().toISOString() // won't match DB exactly but fine for UI return
      };
    } else {
      // LOCAL FALLBACK
      await delay(200);
      const existingAccounts = await AccountService.getAll();
      const index = existingAccounts.findIndex(a => a.code === code);
      if (index === -1) throw new Error("Account not found");
      const updatedAccount: Account = {
        ...existingAccounts[index],
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        type: data.type,
        initialBalance: Number(data.initialBalance),
        currency: data.currency
      };
      existingAccounts[index] = updatedAccount;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAccounts));
      return updatedAccount;
    }
  },

  delete: async (code: string): Promise<void> => {
    if (code === CASH_CODE) throw new Error("No se puede eliminar la cuenta principal.");
    
    if (db.isConfigured()) {
      await db.query('DELETE FROM accounts WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existingAccounts = await AccountService.getAll();
      existingAccounts = existingAccounts.filter(a => a.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAccounts));
    }
  }
};