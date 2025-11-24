import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, AlertTriangle, Database, RefreshCw, ShieldAlert, Activity, Terminal, Trash2, Building } from 'lucide-react';
import { db } from '../services/db';

const SettingsPage: React.FC = () => {
  const [dbUrl, setDbUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  // Initialization & Schema Check State
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
    if (!urlToCheck) {
        setSchemaStatus('unknown');
        return;
    }

    try {
      // Check for accounts table
      const tableCheck = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts';"
      );
      
      if (!tableCheck || tableCheck.length === 0) {
        setSchemaStatus('missing');
        return;
      }

      // Check for columns (legacy check)
      const columnCheck = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'currency';"
      );

      if (!columnCheck || columnCheck.length === 0) {
        setSchemaStatus('incomplete');
      } else {
        setSchemaStatus('ok');
      }

    } catch (e) {
      console.error("Schema check failed:", e);
      setSchemaStatus('unknown');
    }
  };

  const handleTest = async () => {
    setStatus('testing');
    setMessage('Intentando conectar...');
    
    const cleaned = db.cleanUrl(dbUrl);
    setDbUrl(cleaned); 
    
    const originalUrl = db.getUrl();
    db.setUrl(cleaned); 

    const success = await db.testConnection();
    
    if (success) {
      setStatus('success');
      setMessage('¡Conexión exitosa! URL Guardada.');
      db.setUrl(cleaned); 
      window.dispatchEvent(new Event('db-config-changed'));
      checkSchema(cleaned);
    } else {
      setStatus('error');
      setMessage('No se pudo conectar. Verifica la URL.');
      setSchemaStatus('unknown');
      if (originalUrl) db.setUrl(originalUrl);
    }
  };

  const handleSave = () => {
    const cleaned = db.cleanUrl(dbUrl);
    setDbUrl(cleaned);
    db.setUrl(cleaned);
    
    window.dispatchEvent(new Event('db-config-changed'));
    setStatus('idle');
    setMessage('Configuración guardada.');
    checkSchema(cleaned);
    alert('Configuración guardada correctamente.');
  };

  const handleDisconnect = () => {
    if(window.confirm('¿Desconectar la base de datos? Volverás al modo Local.')) {
      setDbUrl('');
      db.setUrl('');
      window.dispatchEvent(new Event('db-config-changed'));
      setStatus('idle');
      setMessage('Desconectado. Usando almacenamiento local.');
      setSchemaStatus('unknown');
      setInitLogs([]);
    }
  };

  const handleInitializeStepByStep = async () => {
    const currentStoredUrl = db.getUrl();
    
    if (!currentStoredUrl) {
        alert("⚠️ No se encontró la URL guardada.");
        return;
    }

    if (!window.confirm("¿Estás seguro? Se revisará la estructura y se crearán las tablas/columnas faltantes.")) return;
    
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO DIAGNÓSTICO Y REPARACIÓN..."]); 
    
    try {
        addLog(`🔌 Conectando...`);
        await db.query("SELECT 1");
        addLog("✅ Conexión establecida.");

        const steps = [
        {
            name: "Tipos (ENUMs)",
            sql: `
            DO $$ BEGIN CREATE TYPE public.account_type AS ENUM ('ACTIVO', 'PASIVO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
            DO $$ BEGIN CREATE TYPE public.category_type AS ENUM ('GASTO', 'INGRESO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
            DO $$ BEGIN CREATE TYPE public.currency_code AS ENUM ('HNL', 'USD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
            `
        },
        {
            name: "Tabla: Cuentas (Core)",
            sql: `
            CREATE TABLE IF NOT EXISTS public.accounts (
                code text PRIMARY KEY,
                name text NOT NULL,
                bank_name text,
                account_number text,
                type public.account_type NOT NULL DEFAULT 'ACTIVO',
                initial_balance numeric NOT NULL DEFAULT 0,
                currency public.currency_code NOT NULL DEFAULT 'HNL',
                is_system boolean DEFAULT false,
                created_at timestamp with time zone DEFAULT now() NOT NULL
            );
            `
        },
        { name: "Reparar: Columnas Cuentas", sql: `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS initial_balance numeric NOT NULL DEFAULT 0; ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency public.currency_code NOT NULL DEFAULT 'HNL';` },
        {
            name: "Tabla: Categorías",
            sql: `CREATE TABLE IF NOT EXISTS public.categories (code text PRIMARY KEY, name text NOT NULL, type public.category_type NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);`
        },
        {
            name: "Tabla: Propiedades",
            sql: `CREATE TABLE IF NOT EXISTS public.properties (code text PRIMARY KEY, name text NOT NULL, cadastral_key text, annual_tax numeric DEFAULT 0, value numeric DEFAULT 0, currency public.currency_code DEFAULT 'HNL', created_at timestamp with time zone DEFAULT now() NOT NULL);`
        },
        {
            name: "Tabla: Inquilinos",
            sql: `CREATE TABLE IF NOT EXISTS public.tenants (code text PRIMARY KEY, full_name text NOT NULL, phone text, email text, status text DEFAULT 'ACTIVE', created_at timestamp with time zone DEFAULT now() NOT NULL);`
        },
        { name: "Reparar: Inquilinos", sql: `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE';` },
        {
            name: "Tabla: Apartamentos",
            sql: `CREATE TABLE IF NOT EXISTS public.apartments (code text PRIMARY KEY, property_code text NOT NULL REFERENCES public.properties(code), name text NOT NULL, status text DEFAULT 'AVAILABLE', created_at timestamp with time zone DEFAULT now() NOT NULL);`
        },
        {
            name: "Tabla: Contratos",
            sql: `CREATE TABLE IF NOT EXISTS public.contracts (code text PRIMARY KEY, apartment_code text, tenant_code text NOT NULL REFERENCES public.tenants(code), start_date date NOT NULL, end_date date NOT NULL, amount numeric NOT NULL, payment_day integer NOT NULL, status text DEFAULT 'ACTIVE', created_at timestamp with time zone DEFAULT now() NOT NULL);`
        },
        { name: "Reparar: Contratos (Apt)", sql: `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS apartment_code text;` },
        {
            name: "Tabla: Transacciones",
            sql: `CREATE TABLE IF NOT EXISTS public.transactions (code text PRIMARY KEY, date date NOT NULL, description text NOT NULL, amount numeric NOT NULL, type public.category_type NOT NULL, category_code text NOT NULL, category_name text NOT NULL, account_code text NOT NULL REFERENCES public.accounts(code), account_name text NOT NULL, property_code text, property_name text, created_at timestamp with time zone DEFAULT now() NOT NULL);`
        },
        { name: "Datos Iniciales", sql: `INSERT INTO public.accounts (code, name, bank_name, account_number, type, initial_balance, currency, is_system) VALUES ('EFECTIVO-01', 'Efectivo en Mano', 'Caja Fuerte', 'N/A', 'ACTIVO', 0, 'HNL', true) ON CONFLICT (code) DO NOTHING;` }
        ];

        for (const step of steps) {
            addLog(`⏳ ${step.name}...`);
            await db.query(step.sql);
            addLog(`✅ OK`);
        }
        
        addLog("✨ ¡Proceso completado! Recargando...");
        window.location.reload();

    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR: ${error.message}`);
      alert(`Error al reparar: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  const handleMigrateRealEstate = async () => {
    if (!window.confirm("Esto creará la tabla 'Apartamentos' y actualizará los contratos. ¿Continuar?")) return;
    
    setInitLoading(true);
    setInitLogs(["🏗️ INICIANDO MIGRACIÓN BIENES RAÍCES..."]);
    
    try {
        await db.query("SELECT 1");
        
        // 1. Create Apartments Table
        addLog("🔨 Creando tabla 'apartments'...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS public.apartments (
                code text PRIMARY KEY,
                property_code text NOT NULL REFERENCES public.properties(code),
                name text NOT NULL,
                status text DEFAULT 'AVAILABLE',
                created_at timestamp with time zone DEFAULT now() NOT NULL
            );
        `);
        addLog("✅ Tabla creada.");

        // 2. Update Contracts Table
        addLog("🔗 Actualizando tabla 'contracts'...");
        await db.query(`
            ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS apartment_code text;
            ALTER TABLE public.contracts ALTER COLUMN property_code DROP NOT NULL; 
        `);
        addLog("✅ Estructura actualizada.");

        alert("Migración completada.");
        window.location.reload();

    } catch (error: any) {
        console.error(error);
        addLog(`❌ ERROR: ${error.message}`);
        alert(error.message);
    } finally {
        setInitLoading(false);
    }
  };

  const handleForceRecreateAccounts = async () => {
      if(!confirm("⚠️ PELIGRO: Esto BORRARÁ todas las cuentas. ¿Seguro?")) return;
      setInitLoading(true);
      try {
          await db.query("DROP TABLE IF EXISTS public.accounts CASCADE");
          await handleInitializeStepByStep(); 
      } catch(e: any) { alert(e.message); setInitLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500">Administra la conexión a tu base de datos y preferencias.</p>
      </div>

      {/* CONNECTION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Base de Datos (Neon Postgres)</h2>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <AlertTriangle className="shrink-0 text-amber-500 mt-0.5" size={16} />
              <p>
                Ingresa tu cadena de conexión de Neon. La app limpiará automáticamente el prefijo <code>psql</code>.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL de Conexión</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono text-sm"
                placeholder="Pega aquí tu URL (postgres://...)"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
              />
            </div>

            {/* Status Feedback */}
            {status !== 'idle' && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                status === 'testing' ? 'bg-blue-50 text-blue-700' :
                status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                'bg-red-50 text-red-700'
              }`}>
                {status === 'testing' && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>}
                {status === 'success' && <CheckCircle size={16} />}
                {status === 'error' && <XCircle size={16} />}
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex items-center justify-between">
           <button 
            onClick={handleDisconnect}
            className="text-red-600 text-sm font-medium hover:underline"
          >
            Desconectar
          </button>

          <div className="flex space-x-3">
            <button 
              onClick={handleTest}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Probar Conexión
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm transition-colors"
            >
              <Save size={18} />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAINTENANCE & INITIALIZATION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <ShieldAlert size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Estado del Esquema</h2>
            </div>

            {/* Schema Status Badge */}
            <div className="flex items-center space-x-2">
                <button onClick={() => checkSchema()} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500" title="Revisar Estado">
                    <RefreshCw size={14} />
                </button>
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    schemaStatus === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    schemaStatus === 'missing' ? 'bg-red-50 text-red-700 border-red-200' :
                    schemaStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                    {schemaStatus === 'ok' && <><CheckCircle size={14}/> <span>VERIFICADO</span></>}
                    {schemaStatus === 'missing' && <><AlertTriangle size={14}/> <span>NO DETECTADO</span></>}
                    {schemaStatus === 'incomplete' && <><AlertTriangle size={14}/> <span>INCOMPLETO</span></>}
                    {schemaStatus === 'unknown' && <><Activity size={14}/> <span>DESCONOCIDO</span></>}
                </div>
            </div>
          </div>
          
          <p className="text-slate-500 text-sm mb-6">
            Usa esta herramienta si ves errores de base de datos. El sistema reparará tablas faltantes o columnas antiguas.
          </p>
          
          <div className="space-y-3">
            <button 
                onClick={handleInitializeStepByStep}
                disabled={initLoading}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                schemaStatus === 'ok' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-700 animate-pulse'
                }`}
            >
                {initLoading ? (
                <RefreshCw size={18} className="animate-spin" />
                ) : (
                <Database size={18} />
                )}
                <span>{initLoading ? 'Reparando...' : 'Inicializar / Reparar Tablas'}</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <button 
                    onClick={handleMigrateRealEstate}
                    disabled={initLoading}
                    className="flex items-center justify-center p-3 border border-blue-200 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                    <Building size={16} className="mr-2"/>
                    Migrar Estructura (Apartamentos)
                </button>
                <button 
                    onClick={handleForceRecreateAccounts}
                    disabled={initLoading}
                    className="flex items-center justify-center p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    <Trash2 size={16} className="mr-2"/>
                    Forzar Reset Cuentas
                </button>
            </div>
          </div>
          
          {!dbUrl && (
             <p className="mt-2 text-xs text-red-500 font-medium">⚠️ Debes ingresar y guardar la URL de conexión arriba para habilitar este botón.</p>
          )}

          {/* Activity Log */}
          {initLogs.length > 0 && (
            <div className="mt-6 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-y-auto max-h-48 border border-slate-700 shadow-inner">
                <div className="flex items-center text-slate-400 mb-2 pb-2 border-b border-slate-700">
                    <Terminal size={14} className="mr-2"/>
                    <span>Registro de Actividad</span>
                </div>
                <div className="space-y-1">
                    {initLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;