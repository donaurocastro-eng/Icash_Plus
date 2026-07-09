
import { Tenant, TenantFormData } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_tenants';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Tenant[]): string => {
  let maxId = 0;
  existing.forEach(t => {
    if (t.code.startsWith('INQ-')) {
      const parts = t.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `INQ-${nextId.toString().padStart(3, '0')}`;
};

export const TenantService = {
  getAll: async (): Promise<Tenant[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT code, full_name as "fullName", phone, email, status, created_at as "createdAt"
        FROM tenants ORDER BY created_at DESC
      `);
      // Fallback for status if null (legacy data)
      return rows.map(r => ({ ...r, status: r.status || 'ACTIVE' }));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: TenantFormData): Promise<Tenant> => {
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM tenants');
      const existing = rows.map(r => ({ code: r.code } as Tenant));
      const newCode = generateNextCode(existing);
      
      await db.query(`
        INSERT INTO tenants (code, full_name, phone, email, status) VALUES ($1, $2, $3, $4, $5)
      `, [newCode, data.fullName, data.phone, data.email, data.status]);

      return { code: newCode, ...data, createdAt: new Date().toISOString() };
    } else {
      await delay(300);
      const existing = await TenantService.getAll();
      const newCode = generateNextCode(existing);
      const newTenant: Tenant = {
        code: newCode,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        status: data.status,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newTenant];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newTenant;
    }
  },

  update: async (code: string, data: TenantFormData): Promise<Tenant> => {
     if (db.isConfigured()) {
        await db.query(`UPDATE tenants SET full_name=$1, phone=$2, email=$3, status=$4 WHERE code=$5`,
          [data.fullName, data.phone, data.email, data.status, code]);

        if (data.status === 'INACTIVE') {
          const activeContracts = await db.query(`
            SELECT apartment_code FROM contracts WHERE tenant_code = $1 AND status = 'ACTIVE'
          `, [code]);
          for (const contract of activeContracts) {
            await db.query(`
              UPDATE apartments SET status = 'AVAILABLE' WHERE code = $1
            `, [contract.apartment_code]);
          }
        }

        return { code, ...data, createdAt: new Date().toISOString() };
     } else {
        await delay(200);
        const existing = await TenantService.getAll();
        const index = existing.findIndex(t => t.code === code);
        if (index === -1) throw new Error("Not found");
        existing[index] = { ...existing[index], ...data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

        if (data.status === 'INACTIVE') {
          const contractsData = localStorage.getItem('icash_plus_contracts');
          const contracts = contractsData ? JSON.parse(contractsData) : [];
          const tenantContracts = contracts.filter((c: any) => c.tenantCode === code && c.status === 'ACTIVE');
          
          const apartmentsData = localStorage.getItem('icash_plus_apartments');
          let apartments = apartmentsData ? JSON.parse(apartmentsData) : [];
          
          tenantContracts.forEach((c: any) => {
            const aptIndex = apartments.findIndex((a: any) => a.code === c.apartmentCode);
            if (aptIndex !== -1) {
              apartments[aptIndex].status = 'AVAILABLE';
            }
          });
          localStorage.setItem('icash_plus_apartments', JSON.stringify(apartments));
        }

        return existing[index];
     }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM tenants WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await TenantService.getAll();
      existing = existing.filter(t => t.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};