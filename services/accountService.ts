import { Account, AccountFormData } from '../types';

// Constants
const STORAGE_KEY = 'icash_plus_accounts';
const CASH_CODE = 'EFECTIVO-01';

// Initial Seed Data
const DEFAULT_ACCOUNTS: Account[] = [
  {
    code: CASH_CODE,
    name: 'Efectivo en Mano',
    bankName: 'Caja Fuerte / Billetera',
    accountNumber: 'N/A',
    type: 'ACTIVO',
    isSystem: true,
    createdAt: new Date().toISOString()
  }
];

// Helper to simulate Database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Logic to generate the next available code: CTA-XXX
 */
const generateNextCode = (existingAccounts: Account[]): string => {
  let maxId = 0;

  existingAccounts.forEach(acc => {
    if (acc.code.startsWith('CTA-')) {
      const parts = acc.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  });

  const nextId = maxId + 1;
  // Pad with zeros to ensure at least 3 digits (e.g., 001, 010, 100)
  const paddedId = nextId.toString().padStart(3, '0');
  return `CTA-${paddedId}`;
};

export const AccountService = {
  /**
   * Fetch all accounts. Simulates a DB SELECT.
   * Ensures EFECTIVO-01 always exists.
   */
  getAll: async (): Promise<Account[]> => {
    await delay(300); // Simulate network latency
    const data = localStorage.getItem(STORAGE_KEY);
    
    let accounts: Account[] = data ? JSON.parse(data) : [];

    // Ensure Default Cash account exists (Seed logic)
    if (!accounts.find(a => a.code === CASH_CODE)) {
      accounts = [...DEFAULT_ACCOUNTS, ...accounts];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }

    // Migration helper: If type is missing (from old version), default to ACTIVO
    const migratedAccounts = accounts.map(acc => ({
      ...acc,
      type: acc.type || 'ACTIVO'
    }));

    if (JSON.stringify(migratedAccounts) !== JSON.stringify(accounts)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedAccounts));
      return migratedAccounts;
    }

    return accounts;
  },

  /**
   * Create a new account with auto-generated Code.
   */
  create: async (data: AccountFormData): Promise<Account> => {
    await delay(300);
    const existingAccounts = await AccountService.getAll();
    
    const newCode = generateNextCode(existingAccounts);
    
    const newAccount: Account = {
      code: newCode,
      name: data.name,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      type: data.type,
      isSystem: false,
      createdAt: new Date().toISOString()
    };

    const updatedList = [...existingAccounts, newAccount];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    
    return newAccount;
  },

  /**
   * Update an existing account.
   */
  update: async (code: string, data: AccountFormData): Promise<Account> => {
    await delay(200);
    const existingAccounts = await AccountService.getAll();
    
    const index = existingAccounts.findIndex(a => a.code === code);
    if (index === -1) throw new Error("Account not found");

    const accountToUpdate = existingAccounts[index];
    
    // Prevent changing code or system status
    const updatedAccount: Account = {
      ...accountToUpdate,
      name: data.name,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      type: data.type
    };

    existingAccounts[index] = updatedAccount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAccounts));

    return updatedAccount;
  },

  /**
   * Delete an account. Prevents deleting System accounts.
   */
  delete: async (code: string): Promise<void> => {
    await delay(200);
    if (code === CASH_CODE) {
      throw new Error("No se puede eliminar la cuenta principal de Efectivo.");
    }

    let existingAccounts = await AccountService.getAll();
    existingAccounts = existingAccounts.filter(a => a.code !== code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAccounts));
  }
};