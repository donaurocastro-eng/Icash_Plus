import { Property, PropertyFormData } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_properties';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Property[]): string => {
  let maxId = 0;
  existing.forEach(p => {
    if (p.code.startsWith('AP-')) {
      const parts = p.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `AP-${nextId.toString().padStart(3, '0')}`;
};

export const PropertyService = {
  getAll: async (): Promise<Property[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT code, name, cadastral_key as "cadastralKey", annual_tax as "annualTax", value, currency, created_at as "createdAt"
        FROM properties ORDER BY created_at DESC
      `);
      return rows.map(r => ({...r, annualTax: Number(r.annualTax), value: Number(r.value)}));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: PropertyFormData): Promise<Property> => {
    let finalCode = data.code?.trim();

    if (db.isConfigured()) {
      if (!finalCode) {
         const rows = await db.query('SELECT code FROM properties');
         const existing = rows.map(r => ({ code: r.code } as Property));
         finalCode = generateNextCode(existing);
      }
      
      await db.query(`
        INSERT INTO properties (code, name, cadastral_key, annual_tax, value, currency)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [finalCode, data.name, data.cadastralKey, data.annualTax, data.value, data.currency]);

      return { code: finalCode, ...data, createdAt: new Date().toISOString() } as Property;

    } else {
      await delay(300);
      const existing = await PropertyService.getAll();
      if (!finalCode) {
        finalCode = generateNextCode(existing);
      } else if (existing.some(p => p.code === finalCode)) {
        throw new Error(`El código ${finalCode} ya existe.`);
      }
      const newProperty: Property = {
        code: finalCode,
        name: data.name,
        cadastralKey: data.cadastralKey,
        annualTax: data.annualTax || 0,
        value: data.value || 0,
        currency: data.currency,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newProperty];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newProperty;
    }
  },

  update: async (code: string, data: PropertyFormData): Promise<Property> => {
    if (db.isConfigured()) {
      await db.query(`
        UPDATE properties SET name=$1, cadastral_key=$2, annual_tax=$3, value=$4, currency=$5
        WHERE code=$6
      `, [data.name, data.cadastralKey, data.annualTax, data.value, data.currency, code]);
      return { code, ...data, createdAt: new Date().toISOString() } as Property;
    } else {
      await delay(200);
      const existing = await PropertyService.getAll();
      const index = existing.findIndex(p => p.code === code);
      if (index === -1) throw new Error("Not found");
      existing[index] = { ...existing[index], ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      return existing[index];
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM properties WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await PropertyService.getAll();
      existing = existing.filter(p => p.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};