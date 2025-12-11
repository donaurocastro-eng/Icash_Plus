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

  const handleInitializeStepByStep = async () => {
    if (!window.confirm("Se actualizará la estructura de la base de datos. ¿Continuar?")) return;
    setInitLoading(true);
    setInitLogs(["🚀 INICIANDO ACTUALIZACIÓN DE ESTRUCTURA..."]); 
    
    try {
        await db.query("SELECT 1");
        
        addLog("🔧 Verificando columnas de rastreo (Transaction History)...");
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_code text NULL;`); 
        await db.query(`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contract_code text NULL;`);
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

  // --- REPAIR TOOL 1: PURGE ---
  const handleAnalyzePurge = async () => {
      if (!selectedPurgeCategory) {
          alert("Por favor selecciona una categoría primero.");
          return;
      }
      setInitLoading(true);
      setShowPurgeConfirmUI(false); 
      try {
          // Count only
          const txs = await TransactionService.getAll();
          const count = txs.filter(t => t.categoryCode === selectedPurgeCategory).length;
          setPurgeCount(count);
          addLog(`🔍 Análisis de purga: Encontradas ${count} transacciones para eliminar.`);
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

  const handleInitiatePurge = () => {
      if (!selectedPurgeCategory || !purgeCount) return;
      setShowPurgeConfirmUI(true);
      addLog("⚠️ Solicitando confirmación del usuario para borrar...");
  };

  const handleConfirmPurge = async () => {
      addLog(`🏁 Ejecutando eliminación masiva para: ${selectedPurgeCategory}`);
      
      setIsPurging(true);
      try {
          addLog("⏳ Enviando comando DELETE a la base de datos...");
          
          // Perform Delete
          const deleted = await TransactionService.deleteByCategory(selectedPurgeCategory);
          
          addLog(`✅ RESPUESTA DB: ${deleted} registros eliminados.`);
          
          if (deleted > 0) {
              alert(`✅ ÉXITO: Se eliminaron ${deleted} registros correctamente.`);
          } else {
              alert(`⚠️ AVISO: El sistema reportó 0 eliminaciones.`);
          }
          
          // Reset UI
          setPurgeCount(null); 
          setSelectedPurgeCategory(''); 
          setShowPurgeConfirmUI(false);
          
      } catch (e: any) {
          console.error(e);
          addLog(`❌ ERROR CRÍTICO EXCEPTION: ${e.message}`);
          alert(`❌ ERROR CRÍTICO: ${e.message}`);
      } finally {
          setIsPurging(false);
          addLog("🏁 Proceso de purga finalizado.");
      }
  };

  // --- REPAIR TOOL 2: SYNC CONTRACTS (LOGICA BASADA EN PERIODOS) ---
  const handleRequestSync = () => {
      setShowSyncConfirmUI(true);
      addLog("⚖️ SISTEMA: Preparando sincronización de fechas basada en historial de periodos (billable_period)...");
  };

  const getNextMonthDate = (year: number, month: number, targetDay: number): string => {
      // month is 1-12
      let nextYear = year;
      let nextMonth = month + 1;
      if (nextMonth > 12) {
          nextMonth = 1;
          nextYear++;
      }
      // Handle end of month overflow (e.g. 31st of Feb)
      const maxDays = new Date(nextYear, nextMonth, 0).getDate();
      const finalDay = Math.min(targetDay, maxDays);
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
  };

  const handleExecuteSyncContracts = async () => {
      setIsSyncingContracts(true);
      addLog("⏳ Buscando último mes pagado por contrato...");
      
      try {
          if (db.isConfigured()) {
              addLog("☁️ Modo Nube: Obteniendo contratos activos...");
              const contracts = await db.query(`SELECT * FROM contracts WHERE status = 'ACTIVE'`);
              addLog(`📊 Procesando ${contracts.length} contratos...`);

              let updatedCount = 0;

              for (const contract of contracts) {
                  // New Logic: Find Max Billable Period (YYYY-MM)
                  // Ignora montos, solo busca la etiqueta del mes más reciente
                  const txRes = await db.query(`
                      SELECT MAX(billable_period) as last_period 
                      FROM transactions 
                      WHERE type = 'INGRESO' 
                      AND contract_code = $1
                  `, [contract.code]);
                  
                  const lastPeriod = txRes[0]?.last_period; // "YYYY-MM" or null
                  const paymentDay = parseInt(contract.payment_day) || 1;
                  let newNextDate = contract.start_date; // Default to start date if no payments

                  if (lastPeriod && /^\d{4}-\d{2}$/.test(lastPeriod)) {
                      const [y, m] = lastPeriod.split('-').map(Number);
                      newNextDate = getNextMonthDate(y, m, paymentDay);
                  } else {
                      // No explicit billable periods found. 
                      // Reset to start date.
                      if (!newNextDate) newNextDate = new Date().toISOString().split('T')[0];
                  }
                  
                  // Clean dates for comparison (remove T time part if exists)
                  const currentNextDate = contract.next_payment_date ? contract.next_payment_date.split('T')[0] : '';
                  const calculatedNextDate = newNextDate.split('T')[0];

                  if (currentNextDate !== calculatedNextDate) {
                      await db.query(`UPDATE contracts SET next_payment_date = $1 WHERE code = $2`, [calculatedNextDate, contract.code]);
                      addLog(`🔄 ${contract.code}: Último periodo ${lastPeriod || 'Ninguno'}. Fecha ajustada a ${calculatedNextDate}`);
                      updatedCount++;
                  }
              }
              
              addLog(`✅ Sincronización completada. ${updatedCount} contratos corregidos.`);
              alert(`Se han sincronizado ${updatedCount} contratos basados en los periodos registrados.`);

          } else {
              // LOCAL STORAGE LOGIC
              addLog("💾 Modo Local: Leyendo datos...");
              const contractsStr = localStorage.getItem('icash_plus_contracts');
              const txStr = localStorage.getItem('icash_plus_transactions');
              
              if (contractsStr && txStr) {
                  let contracts: Contract[] = JSON.parse(contractsStr);
                  const transactions: Transaction[] = JSON.parse(txStr);
                  
                  let count = 0;
                  const updatedContracts = contracts.map(c => {
                      if (c.status !== 'ACTIVE') return c;

                      // 1. Find Transactions for this contract with billable_period
                      const contractTxs = transactions.filter(t => 
                          t.type === 'INGRESO' && 
                          t.contractCode === c.code &&
                          t.billablePeriod
                      );
                      
                      // 2. Find Max Period (String comparison works for YYYY-MM)
                      let maxPeriod = '';
                      contractTxs.forEach(t => {
                          if (t.billablePeriod && t.billablePeriod > maxPeriod) {
                              maxPeriod = t.billablePeriod!;
                          }
                      });

                      // 3. Calc Next Date
                      const paymentDay = c.paymentDay || 1;
                      let newNextDate = c.startDate;

                      if (maxPeriod) {
                          const [y, m] = maxPeriod.split('-').map(Number);
                          newNextDate = getNextMonthDate(y, m, paymentDay);
                      }

                      // 4. Update if needed
                      if (c.nextPaymentDate !== newNextDate) {
                          addLog(`🔄 ${c.code}: Último mes ${maxPeriod || 'Ninguno'}. Ajustando a ${newNextDate}`);
                          count++;
                          return { ...c, nextPaymentDate: newNextDate };
                      }
                      return c;
                  });

                  if (count > 0) {
                      localStorage.setItem('icash_plus_contracts', JSON.stringify(updatedContracts));
                      addLog(`✅ ÉXITO: ${count} contratos recalibrados.`);
                      alert(`Sincronización finalizada. ${count} contratos actualizados.`);
                      window.dispatchEvent(new Event('storage'));
                  } else {
                      addLog("✅ Todos los contratos ya están correctamente sincronizados.");
                      alert("Todo está en orden. No hubo cambios.");
                  }
              } else {
                  addLog("❌ No hay datos suficientes para sincronizar.");
              }
          }
      } catch (e: any) {
          addLog(`❌ ERROR: ${e.message}`);
          console.error(e);
          alert(`Error: ${e.message}`);
      } finally {
          setIsSyncingContracts(false);
          setShowSyncConfirmUI(false);
          addLog("🏁 Proceso finalizado.");
      }
  };

  // --- REPAIR TOOL 3: DATE ALIGNMENT ---
  const handleAnalyzeDates = async () => {
    setInitLoading(true);
    setAnalysisResults([]);
    setHasAnalyzed(false);
    setShowConfirmFix(false);
    addLog("🔍 Analizando consistencia de fechas en contratos activos...");

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
        if (discrepancies.length > 0) {
            addLog(`⚠️ Se encontraron ${discrepancies.length} contratos con días de pago desalineados.`);
        } else {
            addLog(`✅ Todos los contratos están perfectamente alineados.`);
        }

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
          addLog(`✅ CORRECCIÓN APLICADA: ${success} contratos actualizados.`);
          alert(`Se corrigieron ${success} contratos exitosamente.`);
      } catch (err: any) {
          addLog(`❌ Error: ${err.message}`);
          alert(`Error al corregir: ${err.message}`);
      } finally {
          setIsFixing(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
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
          
          {/* COLUMN 1: SAFE TOOLS */}
          <div className="space-y-8">
              
              {/* DATABASE HEALTH */}
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
                          Utiliza esta herramienta si experimentas errores de "columna no encontrada" o después de una actualización del sistema. No borra datos, solo agrega estructuras faltantes.
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

              {/* DATE FIXER */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 group-hover:bg-amber-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                              <Wrench size={24} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg">Corrector de Fechas</h3>
                              <p className="text-sm text-slate-500">Alineación de días de pago</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-6">
                      <p className="text-slate-600 mb-4 text-sm">
                          Detecta contratos donde la "Fecha de Próximo Pago" no coincide con el "Día de Pago" configurado (ej. dice día 15 pero el contrato es día 1).
                      </p>
                      
                      <div className="flex gap-3">
                          <button 
                              onClick={handleAnalyzeDates}
                              className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-amber-400 hover:text-amber-600 transition-colors flex justify-center items-center gap-2"
                          >
                              <Search size={20}/> <span>Analizar</span>
                          </button>

                          {showConfirmFix ? (
                              <button onClick={handleApplyFixes} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-md animate-pulse flex justify-center items-center gap-2">
                                  <Check size={20}/> Confirmar ({analysisResults.length})
                              </button>
                          ) : (
                              <button 
                                  onClick={() => setShowConfirmFix(true)} 
                                  disabled={analysisResults.length === 0} 
                                  className={`flex-1 py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 transition-all ${analysisResults.length > 0 ? 'bg-amber-500 hover:bg-amber-600 shadow-md' : 'bg-slate-200 cursor-not-allowed text-slate-400'}`}
                              >
                                  <Wrench size={20}/> <span>Corregir</span>
                              </button>
                          )}
                      </div>
                      
                      {hasAnalyzed && analysisResults.length === 0 && (
                          <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2 border border-emerald-100">
                              <CheckCircle size={16}/> Todo está en orden.
                          </div>
                      )}
                  </div>
              </div>

          </div>

          {/* COLUMN 2: DANGER ZONE & LOGS */}
          <div className="space-y-8">
              
              {/* DANGER ZONE */}
              <div className="bg-white rounded-2xl border-2 border-rose-100 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <ShieldAlert size={120} className="text-rose-500"/>
                  </div>
                  
                  <div className="p-6 border-b border-rose-100 bg-rose-50">
                      <h3 className="font-bold text-rose-800 text-lg flex items-center gap-2">
                          <AlertTriangle size={24}/> Zona de Peligro
                      </h3>
                      <p className="text-sm text-rose-600 mt-1">Acciones destructivas e irreversibles.</p>
                  </div>

                  <div className="p-6 space-y-8">
                      {/* PURGE TOOL */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">1. Purga Selectiva de Transacciones</label>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                              <p className="text-xs text-slate-500">Elimina masivamente registros de una categoría específica (ej. borrar todos los "Alquileres" erróneos).</p>
                              <div className="flex flex-col gap-2">
                                  <select 
                                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                      value={selectedPurgeCategory}
                                      onChange={e => { setSelectedPurgeCategory(e.target.value); setPurgeCount(null); setShowPurgeConfirmUI(false); }}
                                  >
                                      <option value="">Selecciona categoría a purgar...</option>
                                      {categories.map(c => <option key={c.code} value={c.code}>{c.name} ({c.type})</option>)}
                                  </select>
                                  
                                  {/* CONFIRMATION UI */}
                                  {showPurgeConfirmUI ? (
                                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-fadeIn">
                                          <div className="flex items-center gap-2 text-rose-800 font-bold mb-2">
                                              <AlertTriangle size={20}/>
                                              Confirmar Eliminación
                                          </div>
                                          <p className="text-xs text-rose-700 mb-4">
                                              Vas a eliminar <strong>{purgeCount}</strong> transacciones. Esto afectará el saldo de tus cuentas. Esta acción no se puede deshacer.
                                          </p>
                                          <div className="flex gap-2">
                                              <button 
                                                  onClick={() => setShowPurgeConfirmUI(false)}
                                                  className="flex-1 py-2 bg-white border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-50"
                                              >
                                                  Cancelar
                                              </button>
                                              <button 
                                                  onClick={handleConfirmPurge}
                                                  className="flex-[2] py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-sm flex justify-center items-center gap-2"
                                              >
                                                  <Trash2 size={14}/> SÍ, ELIMINAR AHORA
                                              </button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex gap-2">
                                          <button 
                                              onClick={handleAnalyzePurge}
                                              disabled={!selectedPurgeCategory || initLoading}
                                              className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 text-xs uppercase tracking-wider"
                                          >
                                              Escanear
                                          </button>
                                          {purgeCount !== null && purgeCount > 0 && (
                                              <button 
                                                  onClick={handleInitiatePurge}
                                                  disabled={isPurging}
                                                  className="flex-[2] py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 shadow-md text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                              >
                                                  {isPurging ? <Activity size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                                                  Preparar ({purgeCount})
                                              </button>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="w-full h-px bg-rose-100"></div>

                      {/* SYNC CONTRACTS */}
                      <div>
                          <div className="flex justify-between items-start mb-2">
                              <label className="block text-sm font-bold text-slate-700">2. Sincronizar Calendario de Cobros</label>
                          </div>
                          
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                              <div className="flex items-center justify-between gap-4">
                                  <div className="text-xs text-slate-500 flex-1 space-y-1">
                                      <p>Analiza el <strong>Periodo Facturable</strong> (YYYY-MM) de los pagos y establece el próximo mes pendiente.</p>
                                      <p className="text-indigo-600 font-medium">Lógica: Si el último pago es Marzo, el próximo cobro será Abril.</p>
                                  </div>
                                  {!showSyncConfirmUI && (
                                      <button 
                                          onClick={handleRequestSync}
                                          disabled={isSyncingContracts}
                                          className="px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 shadow-sm text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap"
                                      >
                                          {isSyncingContracts ? <Activity size={16} className="animate-spin"/> : <Calculator size={16}/>}
                                          Recalcular
                                      </button>
                                  )}
                              </div>

                              {/* CONFIRMATION UI FOR SYNC */}
                              {showSyncConfirmUI && (
                                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-fadeIn">
                                      <div className="flex items-center gap-2 text-indigo-800 font-bold mb-2">
                                          <RefreshCw size={20}/>
                                          Confirmar Sincronización
                                      </div>
                                      <div className="text-xs text-indigo-800 mb-4 leading-relaxed space-y-2">
                                          <p>El sistema ignorará los montos y solo mirará qué meses están marcados como pagados.</p>
                                          <ul className="list-disc pl-4 space-y-1 opacity-80">
                                              <li><strong>Pagos Borrados:</strong> Si borras un pago, la fecha retrocederá automáticamente al mes faltante.</li>
                                              <li><strong>Pagos Futuros:</strong> Si hay meses adelantados, la fecha avanzará.</li>
                                          </ul>
                                      </div>
                                      <div className="flex gap-2">
                                          <button 
                                              onClick={() => { setShowSyncConfirmUI(false); addLog("🚫 Acción cancelada por el usuario."); }}
                                              className="flex-1 py-2 bg-white border border-indigo-200 text-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100"
                                          >
                                              Cancelar
                                          </button>
                                          <button 
                                              onClick={handleExecuteSyncContracts}
                                              className="flex-[2] py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex justify-center items-center gap-2"
                                          >
                                              <Play size={14}/> EJECUTAR AHORA
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              {/* CONSOLE */}
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