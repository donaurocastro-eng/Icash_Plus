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

const toDateString = (val: any): string => {
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
};

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
        date: toDateString(r.date)
      }));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: TransactionFormData): Promise<Transaction> => {
    // --- AUTOMATED TRANSFER LOGIC ---
    if (data.type === 'TRANSFERENCIA') {
        if (!data.destinationAccountCode) throw new Error("Cuenta destino requerida.");
        
        // 1. Create OUT Transaction (Gasto)
        await TransactionService.create({
            ...data,
            type: 'GASTO',
            categoryCode: 'CAT-EXP-013', // Transferencia Saliente
            description: `Transferencia Saliente: ${data.description}`
        });

        // 2. Create IN Transaction (Ingreso)
        const inTx = await TransactionService.create({
            ...data,
            type: 'INGRESO',
            accountCode: data.destinationAccountCode,
            categoryCode: 'CAT-INC-007', // Transferencia Entrante
            description: `Transferencia Entrante: ${data.description}`
        });
        
        return inTx; // Return the second one just as confirmation
    }

    // --- STANDARD LOGIC ---
    const accounts = await AccountService.getAll();
    const cleanAccCode = data.accountCode.trim();
    const account = accounts.find(a => a.code === cleanAccCode);
    if (!account) throw new Error(`La cuenta origen '${cleanAccCode}' no existe.`);

    const categories = await CategoryService.getAll();
    const cleanCatCode = data.categoryCode.trim();
    const category = categories.find(c => c.code === cleanCatCode);
    // If category not found (e.g. initial setup), fallback or throw
    const categoryName = category ? category.name : 'General'; 
    const finalCatCode = category ? category.code : cleanCatCode;

    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM transactions');
      const existing = rows.map(r => ({ code: r.code } as Transaction));
      const newCode = generateNextCode(existing);

      await db.query(`
        INSERT INTO transactions (
          code, date, description, amount, type,
          category_code, category_name,
          account_code, account_name,
          property_code, property_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        newCode, data.date, data.description, data.amount, data.type,
        finalCatCode, categoryName,
        account.code, account.name,
        data.propertyCode, data.propertyName
      ]);

      let adjustment = data.amount;
      if (data.type === 'GASTO') adjustment = -adjustment;
      await db.query(`UPDATE accounts SET initial_balance = initial_balance + $1 WHERE code = $2`, [adjustment, account.code]);

      return {
        code: newCode,
        ...data,
        categoryName: categoryName,
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
        categoryCode: finalCatCode,
        categoryName: categoryName,
        accountCode: account.code,
        accountName: account.name,
        propertyCode: data.propertyCode || '',
        propertyName: data.propertyName || '',
        createdAt: new Date().toISOString()
      };
      const updatedList = [newTransaction, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      
      await updateLocalAccountBalance(account.code, newTransaction.amount, data.type as 'GASTO'|'INGRESO', false);
      
      return newTransaction;
    }
  },

  update: async (code: string, data: TransactionFormData): Promise<Transaction> => {
    // Block editing of auto-generated transfers for safety simplicity
    if (data.type === 'TRANSFERENCIA') throw new Error("No se pueden editar transferencias. Elimine y cree de nuevo.");

    const accounts = await AccountService.getAll();
    const account = accounts.find(a => a.code === data.accountCode);
    if (!account) throw new Error(`Cuenta inválida.`);

    const categories = await CategoryService.getAll();
    const category = categories.find(c => c.code === data.categoryCode);
    const categoryName = category ? category.name : 'General';

    if (db.isConfigured()) {
        const oldTxRows = await db.query('SELECT amount, type, account_code FROM transactions WHERE code=$1', [code]);
        if (oldTxRows.length === 0) throw new Error("Transacción no encontrada");
        const oldTx = oldTxRows[0];
        
        let reverseAdj = Number(oldTx.amount);
        if (oldTx.type === 'GASTO') reverseAdj = -reverseAdj;
        reverseAdj = -reverseAdj;
        await db.query(`UPDATE accounts SET initial_balance = initial_balance + $1 WHERE code = $2`, [reverseAdj, oldTx.account_code]);

        let newAdj = data.amount;
        if (data.type === 'GASTO') newAdj = -newAdj;
        await db.query(`UPDATE accounts SET initial_balance = initial_balance + $1 WHERE code = $2`, [newAdj, account.code]);

        await db.query(`
            UPDATE transactions 
            SET date=$1, description=$2, amount=$3, type=$4, category_code=$5, category_name=$6, account_code=$7, account_name=$8, property_code=$9, property_name=$10
            WHERE code=$11
        `, [data.date, data.description, data.amount, data.type, data.categoryCode, categoryName, account.code, account.name, data.propertyCode, data.propertyName, code]);

        return { code, ...data, categoryName, accountName: account.name, createdAt: new Date().toISOString() } as Transaction;
    } else {
         throw new Error("Edición local limitada.");
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
       const rows = await db.query('SELECT amount, type, account_code FROM transactions WHERE code=$1', [code]);
       if (rows.length === 0) return;
       const tx = rows[0];
       const amount = Number(tx.amount);

       let adjustment = amount;
       if (tx.type === 'GASTO') adjustment = -adjustment;
       adjustment = -adjustment; 
       await db.query(`UPDATE accounts SET initial_balance = initial_balance + $1 WHERE code = $2`, [adjustment, tx.account_code]);

       await db.query('DELETE FROM transactions WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await TransactionService.getAll();
      const txToDelete = existing.find(t => t.code === code);
      if (!txToDelete) throw new Error("Transacción no encontrada");
      
      await updateLocalAccountBalance(txToDelete.accountCode, txToDelete.amount, txToDelete.type as any, true);
      
      existing = existing.filter(t => t.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};