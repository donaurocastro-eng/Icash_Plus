export type AccountType = 'ACTIVO' | 'PASIVO';
export type CategoryType = 'GASTO' | 'INGRESO' | 'TRANSFERENCIA';
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
  
  loanId?: string;
  loanCode?: string;
  paymentNumber?: number;
  
  createdAt: string;
}

export interface TransactionFormData {
  date: string;
  description: string;
  amount: number;
  type: CategoryType;
  categoryCode: string; 
  accountCode: string;
  destinationAccountCode?: string; // New: For UI Logic only
  propertyCode?: string;
  propertyName?: string;
  loanId?: string;
  loanCode?: string;
  paymentNumber?: number;
}

// ... Rest of types remain unchanged ...
// (Real Estate, Loans, etc.)

export interface Property {
  code: string;         
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
  code: string;         
  propertyCode: string; 
  name: string;         
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

export interface PropertyServiceItem {
  code: string;          
  propertyCode: string;  
  name: string;          
  defaultAmount: number; 
  defaultCategoryCode?: string; 
  defaultAccountCode?: string; 
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
  accountCode: string; 
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

export type PaymentStatus = 'PENDING' | 'PAID';

export interface Payment {
    paymentNumber: number;
    dueDate: string;
    principal: number;
    interest: number;
    insurance: number;
    totalPayment: number;
    remainingBalance: number;
    status: PaymentStatus;
    paidAmount?: number;
    paidDate?: string;
    extraPrincipalPaid?: number;
}

export interface Loan {
    id: string; 
    loanCode: string; 
    lenderName: string;
    loanNumber?: string;
    initialAmount: number;
    currency: Currency;
    loanDate: string;
    notes?: string;
    isArchived: boolean;
    interestRate?: number; 
    term?: number; 
    monthlyInsurance?: number;
    paymentPlan: Payment[];
    createdAt: string;
}

export interface LoanFormData {
    lenderName: string;
    loanNumber?: string;
    initialAmount: number;
    currency: Currency;
    loanDate: string;
    notes?: string;
    interestRate?: number;
    term?: number;
    monthlyInsurance?: number;
}

export interface LoanPaymentData {
    loan: Loan;
    amount: number;
    extraPrincipal: number;
    fromAccountId: string; 
    date: string;
    paymentNumber?: number;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  ACCOUNTS = 'accounts',
  CATEGORIES = 'categories',
  TRANSACTIONS = 'transactions',
  REAL_ESTATE = 'real_estate',
  LOANS = 'loans',
  REPORTS = 'reports',
  AI_ASSISTANT = 'ai_assistant',
  SETTINGS = 'settings'
}