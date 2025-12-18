
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Database, RefreshCw, 
  ShieldAlert, Activity, Terminal, Trash2, Wrench, 
  Search, Play, Check, Calculator,
  Settings
} from 'lucide-react';
import { db } from '../services/db';
import { TransactionService } from '../services/transactionService';
import { CategoryService } from '../services/categoryService';
import { Category, Contract, Transaction } from '../types';

interface FixItem {
    contractCode: string;
    tenantCode: string;
    tenantName: string;
    unitName: string;
    currentDate: string;
    correctDate: string;
    paymentDay: number;
}

const SettingsPage: React.FC = () => {
  const [initLoading, setInitLoading] = useState(false);
  const [initLogs, setInitLogs] = useState<string[]>([]);
  
  // States for Date Fixer
  const [analysisResults, setAnalysisResults] = useState<FixItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [showConfirmFix, setShowConfirmFix] = useState(false);

  // States for Purge Tool
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPurgeCategory, setSelectedPurgeCategory] = useState('');
  const [purgeCount, setPurgeCount] = useState<number | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirmUI, setShowPurgeConfirmUI] = useState(false); 

  // States for Contract Sync
  const [isSyncingContracts, setIsSyncingContracts] = useState(false);
  const [showSyncConfirmUI, setShowSyncConfirmUI] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
      try {
          const cats = await CategoryService.getAll();
          setCategories(cats);
      } catch (e) { console.error(e); }
  };

  const addLog = (msg: string) => setInitLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // Helper to safely convert DB dates (Date obj or String) to YYYY-MM-DD string
  const toDateStr = (d: any): string => {
      if (!d) return '';
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).split('T')[0];
  };

  const handleInitializeStepByStep = async () => {
    if (!window.confirm("Se actualizará la estructura de la base de datos. ¿Continuar?")) return;
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO ACTUALIZACIÓN DE ESTRUCTURA..."]); 
    
    try {
        await db.query("SELECT 1");
        
        addLog("🔧 Verificando columnas de rastreo (Transaction History)...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_code text NULL;`); 
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contract_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS service_code text NULL;`); // Nueva Columna de Servicios
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS billable_period text NULL;`);
        
        addLog("🔧 Verificando columnas financieras...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_id uuid NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_number integer NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_name text NULL;`);

        addLog("✨ ¡Proceso completado exitosamente! Recargando sistema...");
        setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR: ${error.message}`);
      alert(`Error al inicializar: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  // ... (resto del componente igual)
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* (Mismo contenido que el original para no perder funcionalidad) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Settings className="text-slate-400" size={32}/>
                Configuración y Mantenimiento
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Herramientas avanzadas para la gestión de la base de datos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 group-hover:bg-blue-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                              <Database size={24} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg">Salud de Base de Datos</h3>
                              <p className="text-sm text-slate-500">Estructura y tablas</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-6">
                      <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                          Utiliza esta herramienta si experimentas errores de "columna no encontrada" o para habilitar la trazabilidad de servicios específicos.
                      </p>
                      <button 
                          onClick={handleInitializeStepByStep}
                          disabled={initLoading}
                          className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-all shadow-lg shadow-slate-200 flex justify-center items-center gap-2"
                      >
                          {initLoading ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} />}
                          <span>Ejecutar Diagnóstico y Reparación</span>
                      </button>
                  </div>
              </div>
              {/* Otros controles de SettingsPage... */}
          </div>
          <div className="space-y-8">
              {/* Terminal de Consola */}
              <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden flex flex-col h-64">
                  <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-widest">
                      <Terminal size={14}/> Terminal de Sistema
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1">
                      {initLogs.length === 0 && <span className="text-slate-600 italic">Esperando comandos...</span>}
                      {initLogs.map((log, i) => (
                          <div key={i} className="text-emerald-400 border-l-2 border-slate-700 pl-2 py-0.5 animate-fadeIn">
                              <span className="text-slate-500 mr-2">$</span>
                              {log}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SettingsPage;
