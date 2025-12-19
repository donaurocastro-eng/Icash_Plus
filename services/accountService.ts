
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
      // MOTOR DE CÁLCULO UNIFICADO (SQL)
      // Basado estrictamente en transacciones: Ingreso (+), Gasto (-)
      const rows = await db.query(`
        SELECT 
          a.code, 
          a.name, 
          a.bank_name as "bankName", 
          a.account_number as "accountNumber", 
          a.type, 
          a.initial_balance as "initialBalance", 
          a.currency, 
          a.is_system as "isSystem", 
          a.created_at as "createdAt",
          (
            COALESCE((
              SELECT SUM(
                CASE 
                  WHEN UPPER(CAST(t.type AS TEXT)) = 'INGRESO' THEN CAST(t.amount AS NUMERIC)
                  WHEN UPPER(CAST(t.type AS TEXT)) = 'GASTO' THEN -CAST(t.amount AS NUMERIC)
                  ELSE 0 
                END
              ) 
              FROM transactions t 
              WHERE t.account_code = a.code
            ), 0)
          ) as "currentBalance"
        FROM accounts a
        ORDER BY a.created_at ASC
      `);
      return rows.map(r => ({ 
        ...r, 
        initialBalance: Number(r.initialBalance || 0),
        currentBalance: Number(r.currentBalance || 0)
      }));
    } else {
      // MOTOR DE CÁLCULO UNIFICADO (LOCAL)
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      let accounts: Account[] = data ? JSON.parse(data) : [];
      if (!accounts.find(a => a.code === CASH_CODE)) {
        accounts = [...DEFAULT_ACCOUNTS, ...accounts];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      }

      const txData = localStorage.getItem('icash_plus_transactions');
      const transactions = txData ? JSON.parse(txData) : [];

      return accounts.map(acc => {
          const movements = transactions
            .filter((t: any) => (t.accountCode === acc.code || t.account_code === acc.code))
            .reduce((sum: number, t: any) => {
                const amt = Number(t.amount || 0);
                const type = (t.type || '').toUpperCase();
                // Lógica de Flujo de Caja Puro
                return sum + (type === 'INGRESO' ? amt : -amt);
            }, 0);

          return { 
            ...acc, 
            initialBalance: Number(acc.initialBalance || 0),
            currentBalance: movements 
          };
      });
    }
  },

  create: async (data: AccountFormData): Promise<Account> => {
    if (db.isConfigured()) {
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
        currentBalance: 0, // Nueva cuenta empieza en 0 hasta que tenga transacciones
        isSystem: false,
        createdAt: new Date().toISOString()
      };
    } else {
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
        currentBalance: 0,
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
      
      const all = await AccountService.getAll();
      return all.find(a => a.code === code)!;
    } else {
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
        initialBalance: Number(data.initialBalance)
      };
      existingAccounts[index] = updatedAccount;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAccounts));
      return updatedAccount;
    }
  },

  delete: async (code: string): Promise<void> => {
    if (code === CASH_CODE) throw new Error("No se puede eliminar la cuenta principal.");
    
    if (db.isConfigured()) {
      await db.query('DELETE FROM transactions WHERE account_code=$1', [code]);
      await db.query('DELETE FROM accounts WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existingAccounts = await AccountService.getAll();
      existingAccounts = existingAccounts.filter(a => a.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAccounts));
    }
  }
};
