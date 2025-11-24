import { Contract, ContractFormData } from '../types';
import { db } from './db';
import { ApartmentService } from './apartmentService';

const STORAGE_KEY = 'icash_plus_contracts';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Contract[]): string => {
  let maxId = 0;
  existing.forEach(c => {
    if (c.code.startsWith('CTR-')) {
      const parts = c.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `CTR-${nextId.toString().padStart(3, '0')}`;
};

// Helper to safe convert DB dates to string YYYY-MM-DD
const toDateString = (val: any): string => {
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
};

export const ContractService = {
  getAll: async (): Promise<Contract[]> => {
    if (db.isConfigured()) {
      // Modified query to be tolerant of schema changes or return legacy data
      const rows = await db.query(`
        SELECT code, 
               apartment_code as "apartmentCode", 
               property_code as "propertyCode", 
               tenant_code as "tenantCode", 
               start_date as "startDate", 
               end_date as "endDate", 
               amount, 
               payment_day as "paymentDay",
               status, 
               created_at as "createdAt"
        FROM contracts ORDER BY created_at DESC
      `);
      return rows.map(r => ({
        ...r, 
        amount: Number(r.amount), 
        paymentDay: Number(r.paymentDay),
        // Fix: Ensure dates are strings, not Date objects, to prevent React rendering errors
        startDate: toDateString(r.startDate),
        endDate: toDateString(r.endDate)
      }));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: ContractFormData): Promise<Contract> => {
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM contracts');
      const existing = rows.map(r => ({ code: r.code } as Contract));
      const newCode = generateNextCode(existing);
      
      await db.query(`
        INSERT INTO contracts (code, apartment_code, tenant_code, start_date, end_date, amount, payment_day, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
      `, [newCode, data.apartmentCode, data.tenantCode, data.startDate, data.endDate, data.amount, data.paymentDay]);

      // Optional: Update Apartment Status to RENTED
      try {
         await db.query(`UPDATE apartments SET status='RENTED' WHERE code=$1`, [data.apartmentCode]);
      } catch (e) { console.warn("Could not auto-update apartment status"); }

      return { code: newCode, ...data, status: 'ACTIVE', createdAt: new Date().toISOString() };
    } else {
      await delay(300);
      const existing = await ContractService.getAll();
      const newCode = generateNextCode(existing);
      const newContract: Contract = {
        code: newCode,
        apartmentCode: data.apartmentCode,
        tenantCode: data.tenantCode,
        startDate: data.startDate,
        endDate: data.endDate,
        amount: data.amount,
        paymentDay: data.paymentDay,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newContract];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newContract;
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM contracts WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await ContractService.getAll();
      existing = existing.filter(c => c.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};