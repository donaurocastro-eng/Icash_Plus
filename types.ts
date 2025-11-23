
export type AccountType = 'ACTIVO' | 'PASIVO';
export type CategoryType = 'GASTO' | 'INGRESO';
export type Currency = 'HNL' | 'USD';

export interface Account {
  code: string;           // Primary Key (e.g., CTA-001, EFECTIVO-01)
  name: string;           // Nombre de la Cuenta
  bankName: string;       // Nombre del Banco
  accountNumber: string;  // Número de Cuenta
  type: AccountType;      // ACTIVO o PASIVO
  initialBalance: number; // Saldo Inicial
  currency: Currency;     // Moneda (HNL o USD)
  isSystem: boolean;      // To identify special accounts like EFECTIVO-01
  createdAt: string;
}

export interface AccountFormData {
  name: string;
  bankName: string;
  accountNumber: string;
  type: AccountType;
  initialBalance: number;
  currency: Currency;
}

export interface Category {
  code: string;           // Primary Key (e.g., CAT-EXP-001, CAT-INC-001)
  name: string;
  type: CategoryType;     // GASTO o INGRESO
  createdAt: string;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
}

export interface Transaction {
  code: string;           // TR-00001
  date: string;           // ISO String YYYY-MM-DD
  description: string;
  amount: number;
  type: CategoryType;     // GASTO | INGRESO
  
  categoryCode: string;
  categoryName: string;
  
  accountCode: string;
  accountName: string;
  
  propertyCode?: string;  // Opcional
  propertyName?: string;  // Opcional
  
  createdAt: string;
}

export interface TransactionFormData {
  date: string;
  description: string;
  amount: number;
  type: CategoryType;
  categoryCode: string;
  accountCode: string;
  propertyCode?: string;
  propertyName?: string;
}

// --- REAL ESTATE TYPES ---

export interface Property {
  code: string;         // AP-001 or Custom
  name: string;
  cadastralKey?: string;
  annualTax: number;
  value: number;
  currency: Currency;
  createdAt: string;
}

export interface PropertyFormData {
  code?: string; // Optional manual code
  name: string;
  cadastralKey?: string;
  annualTax: number;
  value: number;
  currency: Currency;
}

export interface Tenant {
  code: string;         // INQ-001
  fullName: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface TenantFormData {
  fullName: string;
  phone?: string;
  email?: string;
}

export interface Contract {
  code: string;          // CTR-001
  propertyCode: string;
  tenantCode: string;
  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD
  amount: number;
  paymentDay: number;    // 1-31
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

export interface ContractFormData {
  propertyCode: string;
  tenantCode: string;
  startDate: string;
  endDate: string;
  amount: number;
  paymentDay: number;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  ACCOUNTS = 'accounts',
  CATEGORIES = 'categories',
  TRANSACTIONS = 'transactions',
  REAL_ESTATE = 'real_estate',
  SETTINGS = 'settings'
}
