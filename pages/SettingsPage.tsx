import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, AlertTriangle, Database, RefreshCw, ShieldAlert, Activity, Terminal, Trash2, Building, Wrench, FileText } from 'lucide-react';
import { db } from '../services/db';

const SettingsPage: React.FC = () => {
  const [dbUrl, setDbUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<'unknown' | 'ok' | 'missing' | 'incomplete'>('unknown');
  const [initLogs, setInitLogs] = useState<string[]>([]);

  useEffect(() => {
    const current = db.getUrl();
    if (current) {
      setDbUrl(current);
      checkSchema(current);
    }
  }, []);

  const addLog = (msg: string) => setInitLogs(prev => [...prev, msg]);

  const checkSchema = async (urlOverride?: string) => {
    const urlToCheck = urlOverride || db.getUrl();
    if(urlToCheck) setSchemaStatus('ok');
  };

  // ... handlers ...
  const handleTest = async () => { /* ... */ };
  const handleSave = () => { /* ... */ };
  const handleDisconnect = () => { /* ... */ };
  const handlePatchContracts = async () => { /* ... */ };
  const handleMigrateRealEstate = async () => { /* ... */ };
  const handleForceRecreateAccounts = async () => { /* ... */ };

  const handleInitializeStepByStep = async () => {
    const currentStoredUrl = db.getUrl();
    if (!currentStoredUrl) return;
    if (!window.confirm("Se actualizará la estructura de la base de datos. ¿Continuar?")) return;
    
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO ACTUALIZACIÓN..."]); 
    
    try {
        await db.query("SELECT 1");
        
        // ... existing steps ...
        addLog("🛠️ Verificando servicios...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS public.property_services (
                code text PRIMARY KEY,
                property_code text REFERENCES public.properties(code),
                name text NOT NULL,
                default_amount numeric DEFAULT 0,
                active boolean DEFAULT true,
                created_at timestamp with time zone DEFAULT now() NOT NULL
            );
        `);
        
        addLog("🔧 Agregando columna 'default_category_code'...");
        await db.query(`ALTER TABLE public.property_services ADD COLUMN IF NOT EXISTS default_category_code text;`);

        addLog("✨ ¡Proceso completado! Recargando...");
        window.location.reload();

    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR: ${error.message}`);
      alert(`Error: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* ... UI ... */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Mantenimiento</h2>
          
          <button 
            onClick={handleInitializeStepByStep}
            disabled={initLoading}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700`}
          >
            {initLoading ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
            <span>Inicializar / Reparar Tablas (Actualizar Servicios)</span>
          </button>

          {initLogs.length > 0 && (
            <div className="mt-6 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-y-auto max-h-48">
                {initLogs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;