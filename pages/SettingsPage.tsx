import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, AlertTriangle, Database, RefreshCw, ShieldAlert, Activity, Terminal, Trash2, Building, Wrench, FileText, Search, Play, ArrowRight, Check, Scale, Rewind } from 'lucide-react';
import { db } from '../services/db';
import { ContractService } from '../services/contractService';
import { TransactionService } from '../services/transactionService';
import { CategoryService } from '../services/categoryService';
import { Contract, Category } from '../types';

interface FixItem {
    contractCode: string;
    tenantCode: string;
    tenantName: string;
    unitName: string;
    currentDate: string;
    correctDate: string;
    paymentDay: number;
}

interface ReconItem {
    contract: Contract;
    tenantName: string;
    unitName: string;
    foundMonths: number;
    currentNextDate: string;
    calculatedNextDate: string;
}

const SettingsPage: React.FC = () => {
  const [dbUrl, setDbUrl] = useState('');
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

  // States for Contract Reset
  const [isResettingContracts, setIsResettingContracts] = useState(false);

  useEffect(() => {
    const current = db.getUrl();
    if (current) setDbUrl(current);
    loadCategories();
  }, []);

  const loadCategories = async () => {
      try {
          const cats = await CategoryService.getAll();
          setCategories(cats);
      } catch (e) { console.error(e); }
  };

  const addLog = (msg: string) => setInitLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleInitializeStepByStep = async () => {
    if (!window.confirm("Se actualizará la estructura de la base de datos. ¿Continuar?")) return;
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO ACTUALIZACIÓN..."]); 
    
    try {
        await db.query("SELECT 1");
        
        addLog("🔧 Verificando columnas de rastreo (Transaction History)...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_code text NULL;`); 
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contract_code text NULL;`);
        
        addLog("🔧 Verificando otras columnas...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_id uuid NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_number integer NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_code text NULL;`);
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_account_name text NULL;`);

        addLog("✨ ¡Proceso completado! Recargando...");
        setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR: ${error.message}`);
      alert(`Error al inicializar: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  // --- REPAIR TOOL 1: PURGE ---
  const handleAnalyzePurge = async () => {
      if (!selectedPurgeCategory) {
          alert("Por favor selecciona una categoría primero.");
          return;
      }
      setInitLoading(true);
      try {
          // Count only
          const txs = await TransactionService.getAll();
          const count = txs.filter(t => t.categoryCode === selectedPurgeCategory).length;
          setPurgeCount(count);
          addLog(`🔍 Análisis purga: Encontradas ${count} transacciones en la categoría.`);
          if (count === 0) {
              alert("No se encontraron transacciones en esta categoría.");
          }
      } catch (e: any) {
          addLog(`❌ Error: ${e.message}`);
          alert(`Error al analizar: ${e.message}`);
      } finally {
          setInitLoading(false);
      }
  };

  const handleExecutePurge = async () => {
      if (!selectedPurgeCategory || !purgeCount) return;
      
      const confirmMsg = `PELIGRO: ¿Estás seguro de eliminar ${purgeCount} transacciones?\n\nEsta acción es irreversible y afectará los saldos de tus cuentas.`;
      if (!window.confirm(confirmMsg)) return;
      
      setIsPurging(true);
      try {
          // Perform Delete
          const deleted = await TransactionService.deleteByCategory(selectedPurgeCategory);
          
          addLog(`🗑️ ELIMINADAS ${deleted} transacciones correctamente.`);
          
          // Reset UI
          setPurgeCount(null); 
          setSelectedPurgeCategory(''); // Clear selection to force re-selection
          
          // Success Alert
          alert(`✅ ÉXITO: Se eliminaron ${deleted} registros correctamente.`);
          
          // Optional: Refresh page data logic here if needed, but alerting is key
      } catch (e: any) {
          console.error(e);
          addLog(`❌ Error eliminando: ${e.message}`);
          alert(`❌ ERROR CRÍTICO: ${e.message}`);
      } finally {
          setIsPurging(false);
      }
  };

  // --- REPAIR TOOL 2: RESET CONTRACTS ---
  const handleResetContracts = async () => {
      if (!confirm("PELIGRO: Esto pondrá la 'Fecha de Próximo Pago' de TODOS los contratos activos igual a su 'Fecha de Inicio'.\n\nÚsala solo si borraste todos los pagos y quieres empezar de cero a registrarlos uno por uno.")) return;
      
      setIsResettingContracts(true);
      addLog("⏳ Reseteando fechas de contratos...");
      try {
          if (db.isConfigured()) {
              await db.query(`
                UPDATE contracts 
                SET next_payment_date = start_date 
                WHERE status = 'ACTIVE'
              `);
              addLog("✅ Contratos reiniciados a su fecha de inicio.");
              alert("✅ Contratos reiniciados correctamente.");
          } else {
              alert("Función disponible solo en modo base de datos.");
          }
      } catch (e: any) {
          addLog(`❌ Error: ${e.message}`);
          alert(`Error: ${e.message}`);
      } finally {
          setIsResettingContracts(false);
      }
  };

  // --- REPAIR TOOL 3: DATE ALIGNMENT ---
  const handleAnalyzeDates = async () => {
    setInitLoading(true);
    setAnalysisResults([]);
    setHasAnalyzed(false);
    setShowConfirmFix(false);
    addLog("🔍 Iniciando análisis de contratos activos (Día de Pago)...");

    try {
        const contracts = await db.query(`
            SELECT c.code, c.tenant_code, c.next_payment_date, c.payment_day, t.full_name as tenant_name, a.name as unit_name
            FROM contracts c
            LEFT JOIN tenants t ON c.tenant_code = t.code
            LEFT JOIN apartments a ON c.apartment_code = a.code
            WHERE c.status = 'ACTIVE'
        `);
        
        const discrepancies: FixItem[] = [];

        for (const contract of contracts) {
            try {
                if (!contract.next_payment_date) continue;
                let dateStr = '';
                if (contract.next_payment_date instanceof Date) dateStr = contract.next_payment_date.toISOString().split('T')[0];
                else if (typeof contract.next_payment_date === 'string') dateStr = contract.next_payment_date.split('T')[0];
                
                if (!dateStr) continue;

                const [yStr, mStr, dStr] = dateStr.split('-');
                const year = parseInt(yStr);
                const month = parseInt(mStr);
                const currentDay = parseInt(dStr);
                const targetDay = parseInt(contract.payment_day);

                if (!isNaN(targetDay) && targetDay > 0 && targetDay <= 31 && currentDay !== targetDay) {
                    const maxDaysInMonth = new Date(year, month, 0).getDate(); 
                    const finalDay = Math.min(targetDay, maxDaysInMonth);
                    const correctDateStr = `${year}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

                    if (dateStr !== correctDateStr) {
                        discrepancies.push({
                            contractCode: contract.code,
                            tenantCode: contract.tenant_code || 'N/A',
                            tenantName: contract.tenant_name || 'Desconocido',
                            unitName: contract.unit_name || contract.code,
                            currentDate: dateStr,
                            correctDate: correctDateStr,
                            paymentDay: targetDay
                        });
                    }
                }
            } catch (err) { console.error(err); }
        }

        setAnalysisResults(discrepancies);
        setHasAnalyzed(true);
        addLog(`✅ Análisis completado. ${discrepancies.length} discrepancias.`);

    } catch (error: any) {
        addLog(`❌ Error CRÍTICO en análisis: ${error.message}`);
        alert(`Error en análisis: ${error.message}`);
    } finally {
        setInitLoading(false);
    }
  };

  const handleApplyFixes = async () => {
      if (analysisResults.length === 0) return;
      setIsFixing(true);
      setShowConfirmFix(false);
      let success = 0;
      try {
          for (const item of analysisResults) {
              await db.query("UPDATE contracts SET next_payment_date = $1 WHERE code = $2", [item.correctDate, item.contractCode]);
              success++;
          }
          setAnalysisResults([]); 
          addLog(`✅ ${success} fechas corregidas.`);
          alert(`Se corrigieron ${success} contratos.`);
      } catch (err: any) {
          addLog(`❌ Error: ${err.message}`);
          alert(`Error al corregir: ${err.message}`);
      } finally {
          setIsFixing(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* 1. INITIALIZATION SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Database size={20} className="text-brand-600"/> Mantenimiento Base de Datos
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
             <div className="flex-1">
                 <p className="text-sm font-bold text-blue-900">Inicializar / Reparar Estructura</p>
                 <p className="text-xs text-blue-700 mt-1">Agrega las columnas necesarias (Inquilino, Contrato) para que el sistema funcione bien.</p>
             </div>
             <button 
                onClick={handleInitializeStepByStep}
                disabled={initLoading}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
            >
                {initLoading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                <span>Ejecutar</span>
            </button>
          </div>
        </div>
      </div>

      {/* DANGER ZONE: DATA PURGE */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-rose-100 bg-rose-50">
            <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
                <ShieldAlert size={20}/> Zona de Peligro: Depuración
            </h3>
            <p className="text-xs text-rose-600 mt-1">
                Herramientas para eliminar datos erróneos masivamente. Úsalo con precaución.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
              {/* Purge Transactions */}
              <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-slate-700">1. Borrar Transacciones por Categoría</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                      <select 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        value={selectedPurgeCategory}
                        onChange={e => { setSelectedPurgeCategory(e.target.value); setPurgeCount(null); }}
                      >
                          <option value="">Selecciona categoría...</option>
                          {categories.map(c => <option key={c.code} value={c.code}>{c.name} ({c.type})</option>)}
                      </select>
                      <button 
                        onClick={handleAnalyzePurge}
                        disabled={!selectedPurgeCategory || initLoading}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 text-sm"
                      >
                          Analizar
                      </button>
                      {purgeCount !== null && purgeCount > 0 && (
                          <button 
                            onClick={handleExecutePurge}
                            disabled={isPurging}
                            className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 shadow-sm text-sm flex items-center gap-2"
                          >
                              {isPurging ? <Activity size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                              Eliminar {purgeCount} registros
                          </button>
                      )}
                  </div>
                  <p className="text-[10px] text-slate-400">Esto eliminará el dinero de tus cuentas (revierte los ingresos).</p>
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              {/* Reset Contracts */}
              <div className="flex items-center justify-between gap-4">
                  <div>
                      <p className="text-sm font-bold text-slate-700">2. Reiniciar Contratos (Rebobinar Fechas)</p>
                      <p className="text-xs text-slate-500">Devuelve la "Próxima Fecha de Pago" al inicio del contrato para todos los activos.</p>
                  </div>
                  <button 
                    onClick={handleResetContracts}
                    disabled={isResettingContracts}
                    className="px-4 py-2 bg-amber-50 text-white font-bold rounded-lg hover:bg-amber-600 shadow-sm text-sm flex items-center gap-2 whitespace-nowrap"
                  >
                      {isResettingContracts ? <Activity size={16} className="animate-spin"/> : <Rewind size={16}/>}
                      Resetear Fechas
                  </button>
              </div>
          </div>
      </div>

      {/* REPAIR TOOL 3: DATE FIXER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench size={20} className="text-amber-500"/>
                Corrector de Días (Día de Pago)
            </h3>
            <p className="text-sm text-slate-500 mt-1">
                Alinea el día del mes de la fecha de pago con la configuración del contrato.
            </p>
        </div>

        <div className="p-6 bg-slate-50 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                    onClick={handleAnalyzeDates}
                    className="flex-1 w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 hover:text-amber-600 transition-colors shadow-sm"
                >
                    <Search size={18}/> <span>Analizar</span>
                </button>

                {showConfirmFix ? (
                    <button onClick={handleApplyFixes} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md animate-pulse">
                        <Check size={18}/> Confirmar Corrección
                    </button>
                ) : (
                    <button onClick={() => setShowConfirmFix(true)} disabled={analysisResults.length === 0} className={`flex-1 w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 rounded-xl font-bold text-white shadow-md transition-all ${analysisResults.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}>
                        <CheckCircle size={18}/> <span>Corregir ({analysisResults.length})</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* CONSOLE */}
      {initLogs.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-y-auto max-h-64 shadow-inner border border-slate-700">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700 text-slate-400 sticky top-0 bg-slate-900">
                  <Terminal size={14}/> <span>Consola de Actividad</span>
              </div>
              {initLogs.map((log, i) => (
                  <div key={i} className="mb-1 whitespace-pre-wrap border-l-2 border-transparent hover:border-slate-600 pl-2">{log}</div>
              ))}
          </div>
      )}

    </div>
  );
};

export default SettingsPage;