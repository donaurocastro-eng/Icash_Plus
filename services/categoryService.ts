import { Category, CategoryFormData, CategoryType } from '../types';
import { db } from './db';

const STORAGE_KEY = 'icash_plus_categories';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateNextCode = (existing: Category[], type: CategoryType): string => {
  const prefix = type === 'GASTO' ? 'CAT-EXP-' : 'CAT-INC-';
  let maxId = 0;
  existing.forEach(cat => {
    if (cat.code.startsWith(prefix)) {
      const parts = cat.code.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
  });
  const nextId = maxId + 1;
  const paddedId = nextId.toString().padStart(3, '0');
  return `${prefix}${paddedId}`;
};

export const CategoryService = {
  getAll: async (): Promise<Category[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT code, name, type, created_at as "createdAt" 
        FROM categories ORDER BY created_at DESC
      `);
      return rows;
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    if (db.isConfigured()) {
      const rows = await db.query('SELECT code FROM categories');
      const existing = rows.map(r => ({ code: r.code } as Category));
      const newCode = generateNextCode(existing, data.type);

      await db.query(
        'INSERT INTO categories (code, name, type) VALUES ($1, $2, $3)',
        [newCode, data.name, data.type]
      );
      
      return { code: newCode, ...data, createdAt: new Date().toISOString() };
    } else {
      await delay(300);
      const existing = await CategoryService.getAll();
      const newCode = generateNextCode(existing, data.type);
      const newCategory: Category = {
        code: newCode,
        name: data.name,
        type: data.type,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...existing, newCategory];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return newCategory;
    }
  },

  update: async (code: string, data: CategoryFormData): Promise<Category> => {
    if (db.isConfigured()) {
       await db.query('UPDATE categories SET name=$1 WHERE code=$2', [data.name, code]);
       // Note: Changing type in SQL would require changing code, simplified here to just name
       return { code, name: data.name, type: data.type, createdAt: new Date().toISOString() };
    } else {
      await delay(200);
      const existing = await CategoryService.getAll();
      const index = existing.findIndex(c => c.code === code);
      if (index === -1) throw new Error("Category not found");
      existing[index].name = data.name;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      return existing[index];
    }
  },

  delete: async (code: string): Promise<void> => {
    if (db.isConfigured()) {
      await db.query('DELETE FROM categories WHERE code=$1', [code]);
    } else {
      await delay(200);
      let existing = await CategoryService.getAll();
      existing = existing.filter(c => c.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }
};