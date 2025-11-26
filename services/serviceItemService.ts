import { PropertyServiceItem, PropertyServiceItemFormData } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_services';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: PropertyServiceItem[]): string => {
  let maxId = 0;
  existing.forEach(s => {
    if (s.code.startsWith('SERV-')) {
      const parts = s.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `SERV-${nextId.toString().padStart(3, '0')}`;
};

export const ServiceItemService = {
  getAll: async (): Promise<PropertyServiceItem[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT code, property_code as "propertyCode", name, default_amount as "defaultAmount", active, created_at as "createdAt"
        FROM property_services ORDER BY created_at DESC
      `);
      return rows.map(r => ({...r, defaultAmount: Number(r.defaultAmount)}));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: PropertyServiceItemFormData): Promise<PropertyServiceItem> => {
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM property_services');
      const existing = rows.map(r => ({ code: r.code } as PropertyServiceItem));
      const newCode = generateNextCode(existing);
      
      await db.query(`
        INSERT INTO property_services (code, property_code, name, default_amount, active)
        VALUES ($1, $2, $3, $4, $5)
      `, [newCode, data.propertyCode, data.name, data.defaultAmount, data.active]);

      return { code: newCode, ...data, createdAt: new Date().toISOString() };
    } else {
      await delay(300);
      const existing = await ServiceItemService.getAll();
      const newCode = generateNextCode(existing);
      const newItem: PropertyServiceItem = {
        code: newCode,
        ...data,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newItem];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newItem;
    }
  },

  update: async (code: string, data: PropertyServiceItemFormData): Promise<PropertyServiceItem> => {
    if (db.isConfigured()) {
      await db.query(`
        UPDATE property_services SET property_code=$1, name=$2, default_amount=$3, active=$4
        WHERE code=$5
      `, [data.propertyCode, data.name, data.defaultAmount, data.active, code]);
      return { code, ...data, createdAt: new Date().toISOString() };
    } else {
      await delay(200);
      const existing = await ServiceItemService.getAll();
      const index = existing.findIndex(s => s.code === code);
      if (index === -1) throw new Error("Not found");
      existing[index] = { ...existing[index], ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      return existing[index];
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM property_services WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await ServiceItemService.getAll();
      existing = existing.filter(s => s.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};