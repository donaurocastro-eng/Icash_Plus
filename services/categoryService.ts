import { Category, CategoryFormData, CategoryType } from '../types';

const STORAGE_KEY = 'icash_plus_categories';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Logic to generate code based on Type.
 * GASTO -> CAT-EXP-XXX
 * INGRESO -> CAT-INC-XXX
 */
const generateNextCode = (existing: Category[], type: CategoryType): string => {
  const prefix = type === 'GASTO' ? 'CAT-EXP-' : 'CAT-INC-';
  let maxId = 0;

  existing.forEach(cat => {
    if (cat.code.startsWith(prefix)) {
      const parts = cat.code.split('-');
      // Expected format: CAT, EXP/INC, NUMBER
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  });

  const nextId = maxId + 1;
  const paddedId = nextId.toString().padStart(3, '0');
  return `${prefix}${paddedId}`;
};

export const CategoryService = {
  getAll: async (): Promise<Category[]> => {
    await delay(300);
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  create: async (data: CategoryFormData): Promise<Category> => {
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
  },

  update: async (code: string, data: CategoryFormData): Promise<Category> => {
    await delay(200);
    const existing = await CategoryService.getAll();
    const index = existing.findIndex(c => c.code === code);
    
    if (index === -1) throw new Error("Categoría no encontrada");
    
    // Note: We typically don't change the Type (GASTO/INGRESO) after creation 
    // because it changes the Code logic. For strict integrity, we only allow name changes here,
    // or we would need to regenerate the code if the type changes.
    // For this version, let's allow Name changes only if Type is locked, or basic update.
    
    // Check if type changed to warn or regenerate (Simplifying: Don't allow type change affecting code for now)
    if (existing[index].type !== data.type) {
      // If user really wants to change type, in a real app we might archive old and create new.
      // For now, we will keep the code but update the type tag, OR throw error.
      // Let's regenerate code if type changes.
      const newCode = generateNextCode(existing, data.type);
       const updatedCategory: Category = {
        ...existing[index],
        code: newCode, // Re-ID
        name: data.name,
        type: data.type
      };
      existing[index] = updatedCategory;
    } else {
      existing[index] = {
        ...existing[index],
        name: data.name
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return existing[index];
  },

  delete: async (code: string): Promise<void> => {
    await delay(200);
    let existing = await CategoryService.getAll();
    existing = existing.filter(c => c.code !== code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
};