import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, DollarSign, Trash2 } from 'lucide-react';
import { Contract, Transaction } from '../types';
import { TransactionService } from '../services/transactionService';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  contractLabel: string;
  tenantName?: string;
  unitName?: string;
  onRegisterPayment: (monthDate: Date) => void;
  onDeleteTransaction?: (code: string) => Promise<void>;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  contract,
  contractLabel,
  tenantName,
  unitName,
  onRegisterPayment,
  onDeleteTransaction
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && contract) {
      loadTransactions();
    }
  }, [isOpen, contract, year]);

  const loadTransactions = async () => {
    if (!contract) return;
    setLoading(true);
    try {
        const all = await TransactionService.getAll();
        const filtered = all.filter(t => t.type === 'INGRESO' && t.contractCode === contract.code);
        setTransactions(filtered);
    } catch (e) {
        console.error("Error loading history transactions", e);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (txId: string) => {
      if (confirm("¿Eliminar este pago del historial?") && onDeleteTransaction) {
          await onDeleteTransaction(txId);
          loadTransactions();
      }
  };

  if (!isOpen || !contract) return null;

  const startDate = new Date(contract.startDate);
  const startAdjusted = new Date(startDate.valueOf() + startDate.getTimezoneOffset() * 60000);
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  const getMonthData = (monthIndex: number, currentYear: number) => {
      // Logic: Match billable period if exists, otherwise fallback to transaction date
      const targetPeriod = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`;
      
      const monthTxs = transactions.filter(t => {
          if (t.billablePeriod) return t.billablePeriod === targetPeriod;
          const [tYStr, tMStr] = t.date.split('-');
          return parseInt(tYStr) === currentYear && (parseInt(tMStr) - 1) === monthIndex;
      });

      const totalPaid = monthTxs.reduce((sum, t) => sum + t.amount, 0);
      return { totalPaid, transactions: monthTxs };
  };

  const getMonthStatus = (monthIndex: number, totalPaid: number) => {
    const cellVal = year * 100 + monthIndex;
    const startVal = startAdjusted.getFullYear() * 100 + startAdjusted.getMonth();
    
    if (cellVal < startVal) return 'NA'; 
    if (totalPaid > 0) return 'PAID'; // Simple check: Any payment = Paid for this view

    const todayVal = today.getFullYear() * 100 + today.getMonth();
    if (cellVal === todayVal) return 'DUE_NOW';
    if (cellVal < todayVal) return 'OVERDUE';
    return 'FUTURE';
  };

  const formatMoney = (amount: number) => amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Historial de Pagos</h3>
                <p className="text-sm text-slate-500 font-medium">{contractLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24}/></button>
        </div>

        {/* YEAR SELECTOR */}
        <div className="flex items-center justify-center py-4 gap-6 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronLeft/></button>
            <span className="text-2xl font-bold text-slate-800 w-32 text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronRight/></button>
        </div>

        {/* MONTHS GRID */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            {loading ? (
                 <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(monthIndex => {
                        const { totalPaid, transactions: monthTxs } = getMonthData(monthIndex, year);
                        const status = getMonthStatus(monthIndex, totalPaid);
                        
                        const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                        const dueDate = new Date(year, monthIndex, contract.paymentDay);
                        
                        let cardClass = "border-slate-200 bg-white opacity-60";
                        let icon = <Clock size={20} className="text-slate-300" />;
                        let label = "Futuro";
                        let labelColor = "text-slate-400";
                        let action = null;

                        if (status === 'PAID') { 
                            cardClass = "border-emerald-200 bg-emerald-50 ring-1 ring-emerald-100 opacity-100"; 
                            icon = <CheckCircle size={24} className="text-emerald-500"/>; 
                            label = "PAGADO"; 
                            labelColor = "text-emerald-600"; 
                        }
                        else if (status === 'DUE_NOW') { 
                            cardClass = "border-blue-400 bg-white ring-4 ring-blue-100 shadow-xl transform scale-105 z-10 opacity-100"; 
                            icon = <DollarSign size={24} className="text-blue-600"/>; 
                            label = "PAGAR AHORA"; 
                            labelColor = "text-blue-600"; 
                            action = () => onRegisterPayment(dueDate); 
                        }
                        else if (status === 'OVERDUE') { 
                            cardClass = "border-rose-200 bg-rose-50 shadow-sm opacity-100"; 
                            icon = <AlertCircle size={24} className="text-rose-500"/>; 
                            label = "VENCIDO"; 
                            labelColor = "text-rose-600"; 
                            action = () => onRegisterPayment(dueDate); 
                        }
                        else if (status === 'NA') { 
                            cardClass = "border-slate-100 bg-slate-100 opacity-40"; 
                            label = "-"; 
                            labelColor = "text-slate-300"; 
                            icon = <span/>; 
                        }

                        return (
                            <div key={monthIndex} className={`relative rounded-xl border p-4 flex flex-col justify-between min-h-[140px] transition-all duration-200 ${cardClass}`}>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>
                                        <div className="flex items-center gap-2">
                                            {monthTxs.length > 0 && onDeleteTransaction && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(monthTxs[0].code); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            )}
                                            {icon}
                                        </div>
                                    </div>
                                    
                                    {status !== 'NA' && totalPaid > 0 && (
                                        <div className="mt-2 bg-white/80 p-2 rounded-lg border border-emerald-100">
                                            <span className="text-emerald-700 font-bold text-xs">{formatMoney(totalPaid)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {status !== 'PAID' && <div className={`font-extrabold text-sm mt-2 text-right ${labelColor}`}>{label}</div>}
                                
                                {action && <button onClick={action} className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none rounded-xl" title="Click para pagar" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;