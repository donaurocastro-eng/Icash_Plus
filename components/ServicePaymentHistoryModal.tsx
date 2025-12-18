import React, { useState, useEffect } from 'react';
/* Added AlertTriangle to the imports from lucide-react */
import { X, ChevronLeft, ChevronRight, CreditCard, Clock, CheckCircle, Plus, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { PropertyServiceItem, Transaction } from '../types';
import { TransactionService } from '../services/transactionService';

interface ServicePaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: PropertyServiceItem | null;
  propertyName: string;
  onAddPayment: (date: string) => void;
  onDeleteTransaction?: (code: string) => Promise<void>;
}

const ServicePaymentHistoryModal: React.FC<ServicePaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  service,
  propertyName,
  onAddPayment,
  onDeleteTransaction
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && service) {
      loadHistory();
    }
  }, [isOpen, service, year]);

  const loadHistory = async () => {
    if (!service) return;
    setLoading(true);
    try {
        const allTxs = await TransactionService.getAll();
        const serviceTxs = allTxs.filter(t => {
            if (t.type !== 'GASTO') return false;
            const tYear = parseInt(t.date.split('-')[0]);
            if (t.serviceCode) {
                return tYear === year && t.serviceCode === service.code;
            }
            return tYear === year && 
                   t.propertyCode === service.propertyCode && 
                   t.categoryCode === service.defaultCategoryCode;
        });
        setTransactions(serviceTxs);
    } catch (e) {
        console.error("Error cargando historial de servicios:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (code: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onDeleteTransaction || !window.confirm("¿Deseas eliminar este registro de pago?")) return;
      setDeletingId(code);
      try {
          await onDeleteTransaction(code);
          await loadHistory();
      } catch (e) {
          console.error(e);
      } finally {
          setDeletingId(null);
      }
  };

  if (!isOpen || !service) return null;

  const months = Array.from({ length: 12 }, (_, i) => i);
  const formatMoney = (amount: number) => amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' });

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-fadeIn">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={20} className="text-indigo-600"/> Historial de Pagos: {service.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Propiedad: <span className="font-black text-slate-700">{propertyName}</span></p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID Servicio: {service.code}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={20}/></button>
        </div>
        
        <div className="flex items-center justify-center py-4 gap-8 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 border border-slate-200 active:scale-90"><ChevronLeft size={24}/></button>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">{year}</span>
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Año Fiscal</span>
            </div>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 border border-slate-200 active:scale-90"><ChevronRight size={24}/></button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            {loading && !deletingId ? (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                     <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                     <span className="text-xs font-bold uppercase">Sincronizando operaciones...</span>
                 </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(monthIndex => {
                        const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
                        const monthTxs = transactions.filter(t => (parseInt(t.date.split('-')[1]) - 1) === monthIndex);
                        const totalPaid = monthTxs.reduce((sum, t) => sum + t.amount, 0);
                        const hasPaid = totalPaid > 0;

                        return (
                            <div 
                                key={monthIndex} 
                                className={`relative rounded-xl border-2 p-5 flex flex-col justify-between transition-all group overflow-hidden ${
                                    hasPaid 
                                    ? 'bg-white border-emerald-100 shadow-sm' 
                                    : 'bg-white border-slate-100 opacity-90'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`font-black text-xs tracking-widest ${hasPaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {monthName}
                                    </span>
                                    {hasPaid && <CheckCircle size={18} className="text-emerald-500"/>}
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pagado</p>
                                    <p className={`text-xl font-mono font-black tracking-tighter ${hasPaid ? 'text-slate-800' : 'text-slate-300'}`}>
                                        {formatMoney(totalPaid)}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50">
                                    {monthTxs.length > 0 ? (
                                        <div className="space-y-2">
                                            {monthTxs.map(tx => (
                                                <div key={tx.code} className="flex items-center justify-between group/tx bg-slate-50 p-1.5 rounded border border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-600">{tx.date.split('-')[2]}/{tx.date.split('-')[1]}</span>
                                                        <span className="text-[8px] text-slate-400 font-mono">{tx.code}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold text-slate-700">{formatMoney(tx.amount)}</span>
                                                        <button 
                                                            disabled={!!deletingId}
                                                            onClick={(e) => handleDelete(tx.code, e)} 
                                                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                            title="Eliminar movimiento"
                                                        >
                                                            {deletingId === tx.code ? <div className="animate-spin h-3 w-3 border-b-2 border-rose-500 rounded-full"/> : <Trash2 size={12}/>}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                                                    onAddPayment(date);
                                                }}
                                                className="w-full py-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 rounded flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors"
                                            >
                                                <Plus size={10}/> AÑADIR OTRO
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                                                onAddPayment(date);
                                            }}
                                            className="w-full py-2 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={12}/> REGISTRAR PAGO
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div> <span className="text-slate-600 font-bold">CON PAGOS</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-200 rounded-full"></div> <span className="text-slate-400 font-bold">SIN REGISTROS</span></div>
            </div>
            <div className="text-slate-400 italic font-bold flex items-center gap-1.5">
                <AlertTriangle size={12}/> Para corregir pagos, elimine el registro individual y registre uno nuevo.
            </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePaymentHistoryModal;