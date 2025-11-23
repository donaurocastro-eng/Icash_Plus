export type AccountType = 'ACTIVO' | 'PASIVO';
export type CategoryType = 'GASTO' | 'INGRESO';

export interface Account {
  code: string;           // Primary Key (e.g., CTA-001, EFECTIVO-01)
  name: string;           // Nombre de la Cuenta
  bankName: string;       // Nombre del Banco
  accountNumber: string;  // Número de Cuenta
  type: AccountType;      // ACTIVO o PASIVO
  isSystem: boolean;      // To identify special accounts like EFECTIVO-01
  createdAt: string;
}

export interface AccountFormData {
  name: string;
  bankName: string;
  accountNumber: string;
  type: AccountType;
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

export enum AppRoute {
  DASHBOARD = 'dashboard',
  ACCOUNTS = 'accounts',
  CATEGORIES = 'categories',
  TRANSACTIONS = 'transactions',
  SETTINGS = 'settings'
}