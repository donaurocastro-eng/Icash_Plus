
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CreditCard, Clock, CheckCircle, Plus, Calendar } from 'lucide-react';
import { PropertyServiceItem, Transaction } from '../types';
import { TransactionService } from '../services/transactionService';

interface ServicePaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: PropertyServiceItem | null;
  propertyName: string;
  onAddPayment: (date: string) => void;
}

const ServicePaymentHistoryModal: React.FC<ServicePaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  service,
  propertyName,
  onAddPayment
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

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
        
        // FILTRADO ESTRICTO POR SERVICE_CODE
        const serviceTxs = allTxs.filter(t => {
            if (t.type !== 'GASTO') return false;
            const tYear = parseInt(t.date.split('-')[0]);
            
            // Si la transacción tiene el código del servicio, es un match perfecto
            if (t.serviceCode) {
                return tYear === year && t.serviceCode === service.code;
            }
            
            // Fallback para datos antiguos (basado en Propiedad + Categoría)
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

  if (!isOpen || !service) return null;

  const months = Array.from({ length: 12 }, (_, i) => i);
  const formatMoney = (amount: number) => amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' });

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-fadeIn">
        
        {/* HEADER */}
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
        
        {/* YEAR SELECTOR */}
        <div className="flex items-center justify-center py-4 gap-8 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-all border border-slate-200 active:scale-90"><ChevronLeft size={24}/></button>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">{year}</span>
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Año Fiscal</span>
            </div>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-all border border-slate-200 active:scale-90"><ChevronRight size={24}/></button>
        </div>

        {/* MONTHS GRID */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            {loading ? (
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
                                onClick={() => {
                                    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                                    onAddPayment(date);
                                }}
                                className={`relative rounded-xl border-2 p-5 flex flex-col justify-between transition-all group cursor-pointer active:scale-95 hover:shadow-lg overflow-hidden ${
                                    hasPaid 
                                    ? 'bg-white border-emerald-100 hover:border-emerald-500 shadow-sm' 
                                    : 'bg-white border-slate-100 hover:border-indigo-400 opacity-90 hover:opacity-100'
                                }`}
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-indigo-600 text-white p-1 rounded-full shadow-md">
                                        <Plus size={14} strokeWidth={3}/>
                                    </div>
                                </div>

                                <div className="flex justify-between items-start mb-4">
                                    <span className={`font-black text-xs tracking-widest transition-colors ${hasPaid ? 'text-emerald-600' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                                        {monthName}
                                    </span>
                                    {hasPaid && <CheckCircle size={18} className="text-emerald-500"/>}
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pagado</p>
                                    <p className={`text-xl font-mono font-black tracking-tighter ${hasPaid ? 'text-slate-800' : 'text-slate-300 group-hover:text-slate-400'}`}>
                                        {formatMoney(totalPaid)}
                                    </p>
                                    {monthTxs.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <div className="flex -space-x-1">
                                                {monthTxs.slice(0, 3).map((_, i) => (
                                                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white"></div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-emerald-600 font-bold">
                                                {monthTxs.length} {monthTxs.length === 1 ? 'pago' : 'pagos'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2 text-[9px] font-black text-slate-400 group-hover:text-indigo-500 uppercase tracking-widest transition-colors">
                                    <Calendar size={12} className="shrink-0"/>
                                    <span>{hasPaid ? 'Añadir recibo' : 'Registrar'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"></div> <span className="text-slate-600 font-bold">CON PAGOS</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-200 rounded-full border border-slate-300"></div> <span className="text-slate-400 font-bold">SIN REGISTROS</span></div>
            </div>
            <div className="text-slate-400 italic font-bold flex items-center gap-1.5">
                <Plus size={12}/> Historial filtrado por ID único del servicio
            </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePaymentHistoryModal;
