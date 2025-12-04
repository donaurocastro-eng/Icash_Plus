
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

  const handleInitializeStepByStep = async () => {
    const currentStoredUrl = db.getUrl();
    if (!currentStoredUrl) return;
    if (!window.confirm("Se actualizará la estructura de la base de datos (Incluyendo soporte para Contratos y Pagos). ¿Continuar?")) return;
    
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO ACTUALIZACIÓN..."]); 
    
    try {
        await db.query("SELECT 1");
        
        // LOANS TABLE
        addLog("🛠️ Verificando tabla de Préstamos (loans)...");
        await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`); // Ensure UUID extension
        await db.query(`
            CREATE TABLE IF NOT EXISTS public.loans (
              id uuid NOT NULL DEFAULT uuid_generate_v4(),
              created_at timestamp with time zone NOT NULL DEFAULT now(),
              lender_name text NOT NULL,
              loan_number text NULL,
              initial_amount numeric NOT NULL,
              currency text NOT NULL,
              loan_date timestamp with time zone NOT NULL,
              notes text NULL,
              is_archived boolean NOT NULL DEFAULT false,
              interest_rate numeric NULL,
              term integer NULL,
              monthly_insurance numeric NULL,
              payment_plan jsonb NULL,
              loan_type text NULL,
              loan_code text NULL,
              CONSTRAINT loans_pkey PRIMARY KEY (id),
              CONSTRAINT loans_loan_code_key UNIQUE (loan_code)
            );
        `);

        addLog("🔧 Actualizando tabla de transacciones...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_id uuid NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_number integer NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contract_code text NULL;`);
        
        // NEW COLUMNS FOR TRANSFERS
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_name text NULL;`);

        // EXISTING UPDATES (Just in case)
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
        await db.query(`ALTER TABLE public.property_services ADD COLUMN IF NOT EXISTS default_category_code text;`);
        await db.query(`ALTER TABLE public.property_services ADD COLUMN IF NOT EXISTS default_account_code text;`);

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

  const handleFixContractDates = async () => {
    if (!window.confirm("Esta acción buscará contratos donde la Fecha de Próximo Pago NO coincida con el Día de Pago configurado y la corregirá. ¿Continuar?")) return;
    
    setInitLoading(true);
    setInitLogs([]); // Clear logs for a fresh start
    addLog("🔍 Iniciando análisis de contratos activos...");

    try {
        // Fetch contracts
        const contracts = await db.query(`
            SELECT c.code, c.next_payment_date, c.payment_day, t.full_name as tenant_name, a.name as unit_name
            FROM contracts c
            LEFT JOIN tenants t ON c.tenant_code = t.code
            LEFT JOIN apartments a ON c.apartment_code = a.code
            WHERE c.status = 'ACTIVE'
        `);
        
        let updatesCount = 0;

        for (const contract of contracts) {
            // Handle date parsing safely (Postgres date string YYYY-MM-DD)
            const dateStr = typeof contract.next_payment_date === 'string' 
                ? contract.next_payment_date 
                : new Date(contract.next_payment_date).toISOString().split('T')[0];
                
            const [yStr, mStr, dStr] = dateStr.split('-');
            const year = parseInt(yStr);
            const month = parseInt(mStr) - 1; // JS months are 0-indexed
            const currentDay = parseInt(dStr);
            
            const targetDay = parseInt(contract.payment_day);

            // Validation: Only update if day is different and targetDay is valid (1-31)
            if (currentDay !== targetDay && targetDay > 0 && targetDay <= 31) {
                
                // Calculate max days in that month to avoid overflow (e.g. Feb 30)
                const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
                const finalDay = Math.min(targetDay, maxDaysInMonth);
                
                // Construct new date string YYYY-MM-DD
                const newDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

                if (newDateStr !== dateStr) {
                    await db.query("UPDATE contracts SET next_payment_date = $1 WHERE code = $2", [newDateStr, contract.code]);
                    
                    const label = `${contract.tenant_name || 'Inquilino'} (${contract.unit_name || contract.code})`;
                    addLog(`✏️ CORREGIDO: ${label}`);
                    addLog(`   └─ Fecha cambiada de ${dateStr} ➔ ${newDateStr}`);
                    
                    updatesCount++;
                }
            }
        }
        
        addLog("------------------------------------------------");
        addLog(`✅ ANÁLISIS FINALIZADO.`);
        addLog(`📊 Total contratos procesados: ${contracts.length}`);
        addLog(`🛠️ Total fechas corregidas: ${updatesCount}`);
        
        if (updatesCount > 0) {
            alert(`✅ Se corrigieron exitosamente las fechas de ${updatesCount} contratos.\n\nRevisa el registro en pantalla para más detalles.`);
            // Optional: reload to reflect changes in other tabs, but give user time to read logs
            setTimeout(() => window.location.reload(), 3000);
        } else {
            addLog("👍 Todos los contratos tienen la fecha correcta.");
            alert("Todo está en orden. No se encontraron fechas incorrectas.");
        }
        
    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR CRÍTICO: ${error.message}`);
      alert(`Error: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Mantenimiento Base de Datos</h2>
          <p className="text-sm text-slate-500 mb-4">Utiliza esta opción si acabas de agregar nuevas funcionalidades (como Préstamos o Transferencias) y necesitas actualizar las tablas.</p>
          
          <div className="space-y-4">
            <button 
                onClick={handleInitializeStepByStep}
                disabled={initLoading}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700`}
            >
                {initLoading ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
                <span>Inicializar / Reparar Tablas</span>
            </button>

            <div className="pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Wrench size={16} className="text-slate-400"/>
                    Herramientas de Corrección de Datos
                </h3>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-800">Corregir Fechas de Próximo Pago</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Contratos</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                        Utiliza esta herramienta si ves que los contratos aparecen como "Vencidos" antes de tiempo. 
                        Alinea la fecha de cobro con el "Día de Pago" configurado (ej: cambia 2/12 a 25/12).
                    </p>
                    <button 
                        onClick={handleFixContractDates}
                        disabled={initLoading}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-indigo-700 bg-white border border-indigo-200 rounded-lg font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm disabled:opacity-50"
                    >
                        {initLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        <span>Ejecutar Corrección de Fechas</span>
                    </button>
                </div>
            </div>
          </div>

          {initLogs.length > 0 && (
            <div className="mt-6 bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-y-auto max-h-64 shadow-inner border border-slate-700">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700 text-slate-400">
                    <Terminal size={14}/> <span>Registro de Actividad</span>
                </div>
                {initLogs.map((log, i) => (
                    <div key={i} className="mb-1 whitespace-pre-wrap">{log}</div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
