
export type AccountType = 'ACTIVO' | 'PASIVO';
export type CategoryType = 'GASTO' | 'INGRESO';
export type Currency = 'HNL' | 'USD';

export interface Account {
  code: string;           
  name: string;           
  bankName: string;       
  accountNumber: string;  
  type: AccountType;      
  initialBalance: number; 
  currency: Currency;     
  isSystem: boolean;      
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
  code: string;           
  name: string;
  type: CategoryType;     
  createdAt: string;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
}

export interface Transaction {
  code: string;           
  date: string;           
  description: string;
  amount: number;
  type: CategoryType;     
  
  categoryCode: string;
  categoryName: string;
  
  accountCode: string;
  accountName: string;
  
  propertyCode?: string;  
  propertyName?: string;  
  
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
  code: string;         // AP-001 (Now represents Building/Complex)
  name: string;
  cadastralKey?: string;
  annualTax: number;
  value: number;
  currency: Currency;
  createdAt: string;
}

export interface PropertyFormData {
  code?: string; 
  name: string;
  cadastralKey?: string;
  annualTax: number;
  value: number;
  currency: Currency;
}

export interface Apartment {
  code: string;         // UNIT-001
  propertyCode: string; // Link to Parent Property
  name: string;         // e.g. "Apt 101"
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  createdAt: string;
}

export interface ApartmentFormData {
  propertyCode: string;
  name: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
}

export interface Tenant {
  code: string;         
  fullName: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE'; 
  createdAt: string;
}

export interface TenantFormData {
  fullName: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Contract {
  code: string;          
  apartmentCode: string; 
  tenantCode: string;
  startDate: string;     
  endDate: string;
  nextPaymentDate: string; 
  amount: number;
  paymentDay: number;    
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  propertyCode?: string;
}

export interface ContractFormData {
  apartmentCode: string;
  tenantCode: string;
  startDate: string;
  endDate: string;
  amount: number;
  paymentDay: number;
}

export interface ContractPrice {
  id: string;
  contractCode: string;
  amount: number;
  startDate: string;
  endDate?: string;
}

// Recurring Services/Expenses for Properties
export interface PropertyServiceItem {
  code: string;          // SERV-001
  propertyCode: string;  // Linked to Building/Property
  name: string;          // e.g. "Agua Potable"
  defaultAmount: number; // Estimated cost
  defaultCategoryCode?: string; // Link to Expense Category
  defaultAccountCode?: string; // NEW: Link to Payment Account
  active: boolean;
  createdAt: string;
}

export interface PropertyServiceItemFormData {
  propertyCode: string;
  name: string;
  defaultAmount: number;
  defaultCategoryCode?: string;
  defaultAccountCode?: string;
  active: boolean;
}

export interface ServicePaymentFormData {
    serviceCode: string;
    date: string;
    amount: number;
    accountCode: string;
    categoryCode: string;
    description: string;
}

export interface PaymentFormData {
  contractCode: string;
  date: string;
  amount: number;
  accountCode: string; // Destination account (Bank/Cash)
  description: string;
}

export interface BulkPaymentItem {
    date: string;
    amount: number;
    description: string;
    selected: boolean;
}

export interface BulkPaymentFormData {
    contractCode: string;
    accountCode: string;
    items: BulkPaymentItem[];
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  ACCOUNTS = 'accounts',
  CATEGORIES = 'categories',
  TRANSACTIONS = 'transactions',
  REAL_ESTATE = 'real_estate',
  REPORTS = 'reports',
  SETTINGS = 'settings'
}