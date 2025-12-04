
import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, AlertTriangle, Database, RefreshCw, ShieldAlert, Activity, Terminal, Trash2, Building, Wrench, FileText, Search, Play, ArrowRight, Check } from 'lucide-react';
import { db } from '../services/db';

interface FixItem {
    contractCode: string;
    tenantName: string;
    unitName: string;
    currentDate: string; // YYYY-MM-DD
    correctDate: string; // YYYY-MM-DD
    paymentDay: number;
}

const SettingsPage: React.FC = () => {
  const [dbUrl, setDbUrl] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initLogs, setInitLogs] = useState<string[]>([]);
  
  // States for Repair Tool
  const [analysisResults, setAnalysisResults] = useState<FixItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccessCount, setFixSuccessCount] = useState(0);
  const [fixFailCount, setFixFailCount] = useState(0);
  const [showConfirmFix, setShowConfirmFix] = useState(false); // New state for inline confirmation

  useEffect(() => {
    const current = db.getUrl();
    if (current) {
      setDbUrl(current);
    }
  }, []);

  const addLog = (msg: string) => setInitLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

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
        await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`); 
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

        // EXISTING UPDATES
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
        setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      console.error(error);
      addLog(`❌ ERROR: ${error.message}`);
      alert(`Error: ${error.message}`);
    } finally {
      setInitLoading(false);
    }
  };

  // --- REPAIR TOOL LOGIC ---

  const handleAnalyzeDates = async () => {
    setInitLoading(true);
    setInitLogs([]);
    setAnalysisResults([]);
    setHasAnalyzed(false);
    setShowConfirmFix(false);
    setFixSuccessCount(0);
    setFixFailCount(0);
    addLog("🔍 Iniciando análisis de contratos activos...");

    try {
        const contracts = await db.query(`
            SELECT c.code, c.next_payment_date, c.payment_day, t.full_name as tenant_name, a.name as unit_name
            FROM contracts c
            LEFT JOIN tenants t ON c.tenant_code = t.code
            LEFT JOIN apartments a ON c.apartment_code = a.code
            WHERE c.status = 'ACTIVE'
        `);
        
        const discrepancies: FixItem[] = [];

        for (const contract of contracts) {
            try {
                if (!contract.next_payment_date) continue;

                // Normalize DB Date
                let dateStr = '';
                if (contract.next_payment_date instanceof Date) {
                    dateStr = contract.next_payment_date.toISOString().split('T')[0];
                } else if (typeof contract.next_payment_date === 'string') {
                    // Handle potential timestamp format "2025-12-02 00:00:00"
                    dateStr = contract.next_payment_date.split('T')[0].split(' ')[0]; 
                }
                
                if (!dateStr) continue;

                const [yStr, mStr, dStr] = dateStr.split('-');
                const year = parseInt(yStr);
                const month = parseInt(mStr); // 1-12
                const currentDay = parseInt(dStr);
                const targetDay = parseInt(contract.payment_day);

                // Check mismatch
                if (!isNaN(targetDay) && targetDay > 0 && targetDay <= 31 && currentDay !== targetDay) {
                    // Calc Correct Date
                    // Be careful with Month Overflow (e.g. Feb 30)
                    const maxDaysInMonth = new Date(year, month, 0).getDate(); // day 0 of next month gives last day of this month
                    const finalDay = Math.min(targetDay, maxDaysInMonth);
                    
                    const correctDateStr = `${year}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

                    if (dateStr !== correctDateStr) {
                        discrepancies.push({
                            contractCode: contract.code,
                            tenantName: contract.tenant_name || 'Desconocido',
                            unitName: contract.unit_name || contract.code,
                            currentDate: dateStr,
                            correctDate: correctDateStr,
                            paymentDay: targetDay
                        });
                    }
                }
            } catch (err) {
                console.error(err);
                addLog(`⚠️ Advertencia analizando contrato: ${err}`);
            }
        }

        setAnalysisResults(discrepancies);
        setHasAnalyzed(true);
        addLog(`✅ Análisis completado. ${contracts.length} revisados.`);
        if (discrepancies.length > 0) {
            addLog(`⚠️ ENCONTRADAS ${discrepancies.length} DISCREPANCIAS. Pulsa 'Corregir' para arreglar.`);
        } else {
            addLog(`🎉 Todo está en orden. No se requieren cambios.`);
        }

    } catch (error: any) {
        addLog(`❌ Error CRÍTICO en análisis: ${error.message}`);
    } finally {
        setInitLoading(false);
    }
  };

  const handleApplyFixes = async () => {
      if (analysisResults.length === 0) return;
      
      // Inline confirmation handled by UI state now, this function is called AFTER confirmation
      setIsFixing(true);
      setShowConfirmFix(false);
      let success = 0;
      let fail = 0;

      addLog("🚀 INICIANDO CORRECCIÓN...");

      try {
          for (const item of analysisResults) {
              try {
                  // Ensure date string format is strictly followed
                  if (!item.correctDate || !item.contractCode) throw new Error("Datos inválidos");

                  await db.query("UPDATE contracts SET next_payment_date = $1 WHERE code = $2", [item.correctDate, item.contractCode]);
                  addLog(`✅ Corregido: ${item.tenantName} (${item.currentDate} -> ${item.correctDate})`);
                  success++;
              } catch (e: any) {
                  addLog(`❌ Fallo al corregir ${item.contractCode}: ${e.message}`);
                  fail++;
              }
          }

          setFixSuccessCount(success);
          setFixFailCount(fail);
          setAnalysisResults([]); // Clear preview list to prevent double submit
          addLog(`🏁 PROCESO FINALIZADO. Exitosos: ${success}, Fallidos: ${fail}.`);
          
          if (success > 0) {
              addLog("✅ Corrección aplicada. Puedes navegar al Panel Principal para ver los cambios.");
              // Removed window.location.reload() to prevent errors
          }
      } catch (err: any) {
          addLog(`❌ Error fatal en el proceso de actualización: ${err.message}`);
          setIsFixing(false);
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
                 <p className="text-sm font-bold text-blue-900">Inicializar Tablas</p>
                 <p className="text-xs text-blue-700 mt-1">Crea o repara la estructura necesaria para las nuevas funciones.</p>
             </div>
             <button 
                onClick={handleInitializeStepByStep}
                disabled={initLoading || isFixing}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
            >
                {initLoading && !hasAnalyzed ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                <span>Ejecutar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. REPAIR TOOL SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench size={20} className="text-amber-500"/>
                Corrector de Fechas
            </h3>
            <p className="text-sm text-slate-500 mt-1">
                Herramienta para alinear la "Fecha de Próximo Pago" con el "Día de Pago" configurado en el contrato.
                Utilízalo si ves contratos en mora que deberían estar al día.
            </p>
        </div>

        <div className="p-6 bg-slate-50 space-y-6">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                    onClick={handleAnalyzeDates}
                    disabled={initLoading || isFixing}
                    className="flex-1 w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 hover:text-brand-600 transition-colors shadow-sm disabled:opacity-50"
                >
                    {initLoading && !isFixing ? <RefreshCw size={18} className="animate-spin"/> : <Search size={18}/>}
                    <span>1. Analizar Contratos</span>
                </button>

                <div className="hidden sm:block text-slate-300"><ArrowRight size={24}/></div>

                {showConfirmFix ? (
                    <div className="flex-1 w-full sm:w-auto flex gap-2 animate-fadeIn">
                        <button 
                            onClick={handleApplyFixes}
                            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md animate-pulse"
                        >
                            <Check size={18}/> Confirmar
                        </button>
                        <button 
                            onClick={() => setShowConfirmFix(false)}
                            className="px-4 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300"
                        >
                            <XCircle size={18}/>
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setShowConfirmFix(true)}
                        disabled={analysisResults.length === 0 || isFixing}
                        className={`flex-1 w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 rounded-xl font-bold text-white shadow-md transition-all
                            ${analysisResults.length > 0 
                                ? 'bg-emerald-600 hover:bg-emerald-700' 
                                : 'bg-slate-300 cursor-not-allowed'
                            }`}
                    >
                        {isFixing ? <Activity size={18} className="animate-spin"/> : <CheckCircle size={18}/>}
                        <span>2. Corregir ({analysisResults.length})</span>
                    </button>
                )}
            </div>

            {/* Analysis Results Table */}
            {hasAnalyzed && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-700 text-sm">Resultados del Análisis</span>
                        {analysisResults.length === 0 ? (
                            <span className="text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-1 rounded-full">¡Todo en orden!</span>
                        ) : (
                            <span className="text-amber-600 text-xs font-bold bg-amber-100 px-2 py-1 rounded-full">{analysisResults.length} inconsistencias</span>
                        )}
                    </div>
                    
                    {analysisResults.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Contrato / Inquilino</th>
                                        <th className="px-4 py-2 text-center">Día Config.</th>
                                        <th className="px-4 py-2 text-right text-rose-600">Fecha Actual</th>
                                        <th className="px-4 py-2 text-center"></th>
                                        <th className="px-4 py-2 text-left text-emerald-600">Fecha Correcta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analysisResults.map((item) => (
                                        <tr key={item.contractCode} className="hover:bg-slate-50">
                                            <td className="px-4 py-2">
                                                <div className="font-bold text-slate-700">{item.tenantName}</div>
                                                <div className="text-xs text-slate-400">{item.unitName}</div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">Día {item.paymentDay}</span>
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono text-rose-600 font-medium bg-rose-50/30">
                                                {item.currentDate}
                                            </td>
                                            <td className="px-4 py-2 text-center text-slate-300">
                                                <ArrowRight size={16} className="mx-auto"/>
                                            </td>
                                            <td className="px-4 py-2 text-left font-mono text-emerald-600 font-bold bg-emerald-50/30">
                                                {item.correctDate}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No se encontraron contratos con fechas desalineadas.
                        </div>
                    )}
                </div>
            )}

            {/* Console Logs */}
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
      </div>
    </div>
  );
};

export default SettingsPage;
