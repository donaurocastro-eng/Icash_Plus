
import React, { useState, useMemo } from 'react';
import { X, Trash2, AlertCircle, Calendar, CreditCard, Tag, ArrowUpCircle, ArrowDownCircle, Info, Loader, CheckCircle, User, Hash, Clock } from 'lucide-react';
import { Transaction } from '../types';
import { TransactionService } from '../services/transactionService';

interface DuplicateTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

interface DuplicateGroup {
    key: string;
    date: string;
    amount: number;
    type: string;
    contractCode?: string;
    billablePeriod?: string;
    records: Transaction[];
}

const DuplicateTransactionsModal: React.FC<DuplicateTransactionsModalProps> = ({ isOpen, onClose, transactions }) => {
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [localTxs, setLocalTxs] = useState<Transaction[]>(transactions);

  // Sincronizar transacciones locales cuando cambian los datos externos
  React.useEffect(() => {
    setLocalTxs(transactions);
  }, [transactions]);

  // Lógica de Agrupamiento Refinada
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    localTxs.forEach(tx => {
      /**
       * CRITERIO DE IDENTIDAD REFINADO:
       * Para evitar falsos positivos en alquileres (mismo monto, misma fecha, diferentes personas/meses),
       * incluimos el código de contrato y el periodo facturable en la llave de unicidad.
       */
      const contractKey = tx.contractCode || 'NO_CONTRACT';
      const periodKey = tx.billablePeriod || 'NO_PERIOD';
      
      const key = `${tx.date}|${tx.amount}|${tx.type}|${contractKey}|${periodKey}`;
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });

    return Object.entries(groups)
      .filter(([_, records]) => records.length > 1)
      .map(([key, records]) => {
        const [date, amount, type, contractCode, billablePeriod] = key.split('|');
        return {
          key,
          date,
          amount: parseFloat(amount),
          type,
          contractCode: contractCode === 'NO_CONTRACT' ? undefined : contractCode,
          billablePeriod: billablePeriod === 'NO_PERIOD' ? undefined : billablePeriod,
          records: records.sort((a, b) => a.code.localeCompare(b.code))
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [localTxs]);

  const handleDelete = async (code: string) => {
    if (deletingCode) return;
    setDeletingCode(code);
    try {
      await TransactionService.delete(code);
      setLocalTxs(prev => prev.filter(t => t.code !== code));
    } catch (e) {
      console.error(e);
      alert("Error al eliminar el registro.");
    } finally {
      setDeletingCode(null);
    }
  };

  if (!isOpen) return null;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (isoString: string) => {
    const parts = isoString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoString;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-fadeIn">
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={24}/>
                Auditoría de Duplicados
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Criterio: Coincidencia en Fecha, Monto, Tipo, Contrato y Periodo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3 text-amber-800 text-xs font-medium">
            <Info size={16} className="shrink-0"/>
            <span>Se muestran grupos que coinciden en todos los criterios clave. Los alquileres con diferentes periodos o contratos ahora se tratan por separado.</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {duplicateGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                        <CheckCircle size={40}/>
                    </div>
                    <p className="font-black uppercase tracking-tighter text-lg">No se detectaron duplicados</p>
                    <p className="text-sm max-w-xs text-center opacity-70">Tus registros están limpios según los criterios de auditoría reforzados.</p>
                </div>
            ) : (
                duplicateGroups.map((group) => (
                    <div key={group.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Group Title Bar */}
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400"/>
                                    <span className="font-mono font-bold text-slate-700">{formatDate(group.date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {group.type === 'INGRESO' ? <ArrowUpCircle size={16} className="text-emerald-500"/> : <ArrowDownCircle size={16} className="text-rose-500"/>}
                                    <span className={`font-black text-base ${group.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {formatMoney(group.amount)} HNL
                                    </span>
                                </div>
                                {group.contractCode && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                                        <Hash size={14} className="text-indigo-400"/>
                                        <span className="text-[11px] font-black text-indigo-700 uppercase tracking-tight">CONTRATO: {group.contractCode}</span>
                                        {group.billablePeriod && (
                                            <>
                                                <span className="text-indigo-200">|</span>
                                                <Clock size={14} className="text-indigo-400"/>
                                                <span className="text-[11px] font-black text-indigo-700 uppercase tracking-tight">PERIODO: {group.billablePeriod}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-black uppercase ring-1 ring-amber-200">
                                {group.records.length} REGISTROS IDÉNTICOS
                            </span>
                        </div>

                        {/* Record Comparison Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
                            {group.records.map((tx) => (
                                <div key={tx.code} className="bg-white p-4 space-y-3 relative group">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                {tx.code}
                                            </span>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                                                ID de Registro
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(tx.code)}
                                            disabled={!!deletingCode}
                                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Eliminar este registro"
                                        >
                                            {deletingCode === tx.code ? <Loader size={18} className="animate-spin text-rose-600"/> : <Trash2 size={18}/>}
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {tx.tenantName && (
                                            <div className="flex items-center gap-2">
                                                <User size={12} className="text-indigo-500"/>
                                                <span className="text-xs font-black text-slate-800 uppercase truncate">{tx.tenantName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Tag size={12} className="text-slate-400"/>
                                            <span className="text-xs font-bold text-slate-700 uppercase">{tx.categoryName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={12} className="text-slate-400"/>
                                            <span className="text-xs font-bold text-slate-700 uppercase">{tx.accountName}</span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100 min-h-[40px]">
                                            <p className="text-xs text-slate-600 leading-relaxed italic">
                                                "{tx.description}"
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 flex flex-wrap gap-1">
                                        {tx.propertyName && <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500">PROPIEDAD: {tx.propertyName}</span>}
                                        {tx.billablePeriod && <span className="text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded font-black text-emerald-700 border border-emerald-100 uppercase">MES: {tx.billablePeriod}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] shrink-0">
            <span>Auditando {localTxs.length} registros</span>
            <span>PROTECCIÓN DE INTEGRIDAD ICASH_PLUS</span>
        </div>
      </div>
    </div>
  );
};

export default DuplicateTransactionsModal;
