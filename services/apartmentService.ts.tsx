import { Apartment, ApartmentFormData } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_apartments';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Apartment[]): string => {
  let maxId = 0;
  existing.forEach(a => {
    if (a.code.startsWith('UNIT-')) {
      const parts = a.code.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  return `UNIT-${nextId.toString().padStart(3, '0')}`;
};

export const ApartmentService = {
  getAll: async (): Promise<Apartment[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT code, property_code as "propertyCode", name, status, created_at as "createdAt"
        FROM apartments ORDER BY created_at DESC
      `);
      return rows;
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: ApartmentFormData): Promise<Apartment> => {
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM apartments');
      const existing = rows.map(r => ({ code: r.code } as Apartment));
      const newCode = generateNextCode(existing);
      
      await db.query(`
        INSERT INTO apartments (code, property_code, name, status)
        VALUES ($1, $2, $3, $4)
      `, [newCode, data.propertyCode, data.name, data.status]);

      return { code: newCode, ...data, createdAt: new Date().toISOString() };
    } else {
      await delay(300);
      const existing = await ApartmentService.getAll();
      const newCode = generateNextCode(existing);
      const newApartment: Apartment = {
        code: newCode,
        propertyCode: data.propertyCode,
        name: data.name,
        status: data.status,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newApartment];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newApartment;
    }
  },

  update: async (code: string, data: ApartmentFormData): Promise<Apartment> => {
    if (db.isConfigured()) {
      await db.query(`
        UPDATE apartments SET property_code=$1, name=$2, status=$3
        WHERE code=$4
      `, [data.propertyCode, data.name, data.status, code]);
      return { code, ...data, createdAt: new Date().toISOString() };
    } else {
      await delay(200);
      const existing = await ApartmentService.getAll();
      const index = existing.findIndex(a => a.code === code);
      if (index === -1) throw new Error("Not found");
      existing[index] = { ...existing[index], ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      return existing[index];
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM apartments WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await ApartmentService.getAll();
      existing = existing.filter(a => a.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};