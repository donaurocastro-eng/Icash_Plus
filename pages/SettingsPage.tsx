
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Database, RefreshCw, 
  ShieldAlert, Activity, Terminal, Trash2, Wrench, 
  Search, Play, Check, Calculator,
  Settings, X
} from 'lucide-react';
import { db } from '../services/db';
import { TransactionService } from '../services/transactionService';
import { CategoryService } from '../services/categoryService';
import { Category, Transaction } from '../types';

const SettingsPage: React.FC = () => {
  const [initLoading, setInitLoading] = useState(false);
  const [initLogs, setInitLogs] = useState<string[]>([]);
  const [showRepairConfirm, setShowRepairConfirm] = useState(false);
  
  // States for Purge Tool
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPurgeCategory, setSelectedPurgeCategory] = useState('');
  const [purgeCount, setPurgeCount] = useState<number | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirmUI, setShowPurgeConfirmUI] = useState(false); 

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

  const handleInitializeStepByStep = async () => {
    setShowRepairConfirm(false);
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO DIAGNÓSTICO DE ESTRUCTURA EN NEON..."]); 
    
    try {
        addLog("📡 Verificando conexión con el servidor...");
        await db.query("SELECT 1");
        addLog("✅ Conexión establecida.");

        addLog("🔧 Verificando columnas de rastreo básico...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_code text NULL;`); 
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contract_code text NULL;`);
        addLog("✅ Rastreo básico verificado.");

        addLog("🔧 Creando columna 'service_code' para trazabilidad individual...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS service_code text NULL;`); 
        addLog("✅ Columna de servicios habilitada.");

        addLog("🔧 Verificando integridad de periodos y préstamos...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS billable_period text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_id uuid NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_number integer NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_code text NULL;`);
        addLog("✅ Integridad financiera verificada.");

        addLog("✨ ¡PROCESO COMPLETADO EXITOSAMENTE!");
        addLog("🔄 El sistema se reiniciará en 3 segundos...");
        
        setTimeout(() => window.location.reload(), 3000);

    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR CRÍTICO: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  const handleAnalyzePurge = async () => {
      if (!selectedPurgeCategory) return;
      setIsPurging(true);
      addLog(`🔍 Analizando volumen de datos para categoría: ${selectedPurgeCategory}`);
      try {
          const allTxs = await TransactionService.getAll();
          const count = allTxs.filter(t => t.categoryCode === selectedPurgeCategory).length;
          setPurgeCount(count);
          setShowPurgeConfirmUI(true);
          addLog(`📊 Encontrados ${count} registros para purgar.`);
      } catch (e: any) { 
          addLog(`❌ Error en análisis: ${e.message}`);
      }
      finally { setIsPurging(false); }
  };

  const handleExecutePurge = async () => {
      if (!selectedPurgeCategory) return;
      setIsPurging(true);
      addLog(`🔥 Iniciando purga masiva de ${selectedPurgeCategory}...`);
      try {
          const deleted = await TransactionService.deleteByCategory(selectedPurgeCategory);
          addLog(`✅ Purga completada. Se eliminaron ${deleted} registros.`);
          setShowPurgeConfirmUI(false);
          setPurgeCount(null);
          setSelectedPurgeCategory('');
      } catch (e: any) { 
          addLog(`❌ Error en ejecución: ${e.message}`);
      }
      finally { setIsPurging(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Settings className="text-slate-400" size={32}/>
                Configuración y Mantenimiento
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Gestión de la base de datos Neon (Sin ventanas emergentes).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
              {/* SALUD DE BASE DE DATOS */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 group-hover:bg-blue-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                              <Database size={24} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg">Estructura de la Nube</h3>
                              <p className="text-sm text-slate-500">Migración de columnas</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-6">
                      <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                          Habilita la columna <strong>service_code</strong> para separar historiales de Agua, Luz e Internet individualmente.
                      </p>
                      
                      {!showRepairConfirm ? (
                        <button 
                            onClick={() => setShowRepairConfirm(true)}
                            disabled={initLoading}
                            className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-all shadow-lg flex justify-center items-center gap-2"
                        >
                            <Wrench size={20} />
                            <span>Iniciar Diagnóstico</span>
                        </button>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fadeIn">
                            <p className="text-amber-800 text-xs font-bold mb-3 flex items-center gap-2">
                                <AlertTriangle size={18}/> ¿Confirmas actualizar la estructura?
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setShowRepairConfirm(false)} className="flex-1 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200">Cancelar</button>
                                <button onClick={handleInitializeStepByStep} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">SÍ, PROCEDER</button>
                            </div>
                        </div>
                      )}
                  </div>
              </div>

              {/* PURGA DE CATEGORIAS */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                              <Trash2 size={24} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg">Limpieza de Datos</h3>
                              <p className="text-sm text-slate-500">Borrar por categoría</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 space-y-4">
                      <select 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                          value={selectedPurgeCategory}
                          onChange={e => setSelectedPurgeCategory(e.target.value)}
                      >
                          <option value="">Selecciona categoría para limpiar...</option>
                          {categories.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                      </select>

                      {showPurgeConfirmUI ? (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-fadeIn">
                              <p className="text-rose-800 text-sm font-bold mb-3 flex items-center gap-2">
                                  <AlertTriangle size={18}/> ¿Confirmas eliminar {purgeCount} registros?
                              </p>
                              <div className="flex gap-2">
                                  <button onClick={() => setShowPurgeConfirmUI(false)} className="flex-1 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200">Cancelar</button>
                                  <button onClick={handleExecutePurge} className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold">SÍ, BORRAR TODO</button>
                              </div>
                          </div>
                      ) : (
                          <button 
                            onClick={handleAnalyzePurge}
                            disabled={!selectedPurgeCategory || isPurging}
                            className="w-full py-3 bg-white border-2 border-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-50 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                          >
                            <Search size={18}/> Analizar Volumen
                          </button>
                      )}
                  </div>
              </div>
          </div>

          <div className="space-y-8">
              {/* TERMINAL DE REGISTROS */}
              <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-full min-h-[450px]">
                  <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-widest font-bold">
                        <Terminal size={14} className="text-emerald-500"/> Consola de Sistema
                      </div>
                      <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                      </div>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {initLogs.length === 0 && (
                          <div className="text-slate-600 italic animate-pulse">
                              _ Esperando ejecución de comandos del administrador...
                          </div>
                      )}
                      {initLogs.map((log, i) => (
                          <div key={i} className="text-emerald-400 border-l-2 border-slate-700 pl-3 py-1 bg-white/5 rounded-r-lg animate-fadeIn">
                              <span className="text-indigo-400 mr-2">root@icash:~$</span>
                              {log}
                          </div>
                      ))}
                      {initLoading && <div className="text-emerald-400 animate-bounce pl-3">▋</div>}
                  </div>
                  <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700 text-[9px] text-slate-500 font-mono flex justify-between">
                      <span>status: {initLoading ? 'running' : 'idle'}</span>
                      <span>UTF-8</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SettingsPage;
