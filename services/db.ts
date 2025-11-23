import { Pool } from '@neondatabase/serverless';

const DB_URL_KEY = 'icash_db_url';

export const db = {
  isConfigured: () => !!localStorage.getItem(DB_URL_KEY),
  
  getUrl: () => localStorage.getItem(DB_URL_KEY),

  cleanUrl: (input: string) => {
    if (!input) return '';
    let cleaned = input.trim();
    // Remove 'psql' prefix if present
    if (cleaned.startsWith('psql')) {
      cleaned = cleaned.substring(4).trim();
    }
    // Remove wrapping quotes (single or double)
    if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || 
        (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned;
  },
  
  setUrl: (url: string) => {
    const cleaned = db.cleanUrl(url);
    if (!cleaned) {
      localStorage.removeItem(DB_URL_KEY);
    } else {
      localStorage.setItem(DB_URL_KEY, cleaned);
    }
  },

  testConnection: async (): Promise<boolean> => {
    const url = localStorage.getItem(DB_URL_KEY);
    if (!url) return false;
    try {
      const pool = new Pool({ connectionString: url });
      await pool.query('SELECT NOW()');
      await pool.end();
      return true;
    } catch (e) {
      console.error("DB Connection Failed:", e);
      return false;
    }
  },

  /**
   * Execute a query against Neon.
   * Throws error if DB not configured.
   */
  query: async (text: string, params?: any[]) => {
    const url = localStorage.getItem(DB_URL_KEY);
    if (!url) throw new Error("Database not configured");
    
    const pool = new Pool({ connectionString: url });
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } finally {
      await pool.end(); // Close connection after use (serverless friendly)
    }
  }
};