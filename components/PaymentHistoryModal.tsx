
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { Contract, Transaction } from '../types';
import { TransactionService } from '../services/transactionService';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  contractLabel: string;
  onRegisterPayment: (monthDate: Date) => void;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  contract,
  contractLabel,
  onRegisterPayment
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && contract) {
      loadTransactions();
    }
  }, [isOpen, contract]);

  const loadTransactions = async () => {
    if (!contract) return;
    setLoading(true);
    try {
        // Fetch all transactions and filter in memory
        // Ideally we should filter by contract_code in DB, but this supports legacy data via heuristic
        const all = await TransactionService.getAll();
        
        // Filter rules:
        // 1. Contract Code matches (Best)
        // 2. Property Code matches AND Type is Ingreso AND Description contains "Alquiler"
        const filtered = all.filter(t => {
            if (t.contractCode === contract.code) return true;
            if (contract.propertyCode && t.propertyCode === contract.propertyCode && t.type === 'INGRESO') return true;
            return false;
        });
        setTransactions(filtered);
    } catch (e) {
        console.error("Error loading history transactions", e);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen || !contract) return null;

  const parseDate = (d: string | Date | undefined): Date => {
      if (!d) return new Date();
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return new Date();
      return new Date(dateObj.valueOf() + dateObj.getTimezoneOffset() * 60000);
  };

  const startDate = parseDate(contract.startDate);
  const nextPaymentDate = parseDate(contract.nextPaymentDate || contract.startDate);
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Helper to find actual payment date for a specific month/year
  const getPaymentDate = (monthIndex: number, currentYear: number) => {
      const monthName = new Date(currentYear, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
      
      // Look for a transaction that mentions this month/year or falls in it if contract linked
      // Logic: Find transaction where description includes MonthName
      // AND transaction date is reasonably close (within the year)
      
      const found = transactions.find(t => {
          const desc = t.description.toLowerCase();
          // Check if description contains month name (e.g. "agosto")
          // Also check year if possible, but standard description is "Alquiler Agosto"
          // If we have multiple years, "Alquiler Agosto" might be ambiguous.
          // We can check if transaction date year matches current view year, OR if description has year.
          
          if (!desc.includes(monthName)) return false;
          
          // Safety: If description doesn't have year, check transaction date year
          if (!desc.includes(currentYear.toString())) {
             const tYear = new Date(t.date).getFullYear();
             if (tYear !== currentYear) return false;
          }
          return true;
      });

      return found ? new Date(found.date).toLocaleDateString() : null;
  };

  const getMonthStatus = (monthIndex: number) => {
    const paymentDay = contract.paymentDay || 1;
    const cellVal = year * 100 + monthIndex;
    const startVal = startDate.getFullYear() * 100 + startDate.getMonth();
    const nextPayVal = nextPaymentDate.getFullYear() * 100 + nextPaymentDate.getMonth();
    const todayVal = today.getFullYear() * 100 + today.getMonth();

    if (cellVal < startVal) return 'NA'; 
    if (cellVal < nextPayVal) return 'PAID';
    if (cellVal === nextPayVal) {
        const isPastDueDay = today.getDate() > paymentDay;
        const isPastDueMonth = todayVal > cellVal;
        if (isPastDueMonth || (todayVal === cellVal && isPastDueDay)) return 'OVERDUE_NOW';
        return 'DUE_NOW';
    }
    if (cellVal < todayVal) return 'OVERDUE_FUTURE'; 
    return 'FUTURE';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Historial de Pagos</h3>
                <p className="text-sm text-slate-500 font-medium">{contractLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24}/></button>
        </div>
        <div className="flex items-center justify-center py-4 gap-6 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronLeft/></button>
            <span className="text-2xl font-bold text-slate-800 w-32 text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronRight/></button>
        </div>
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            {loading ? (
                 <div className="flex justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(monthIndex => {
                        const status = getMonthStatus(monthIndex);
                        const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                        const dueDate = new Date(year, monthIndex, contract.paymentDay);
                        const formattedDueDate = dueDate.toLocaleDateString();
                        const paymentDate = getPaymentDate(monthIndex, year);

                        let cardClass = "border-slate-200 bg-white opacity-60", icon = <Clock size={20} className="text-slate-300" />, label = "Futuro", labelColor = "text-slate-400", action = null;

                        if (status === 'PAID') { 
                            cardClass = "border-emerald-200 bg-emerald-50"; 
                            icon = <CheckCircle size={24} className="text-emerald-500"/>; 
                            label = "PAGADO"; 
                            labelColor = "text-emerald-600"; 
                        }
                        else if (status === 'DUE_NOW') { 
                            cardClass = "border-blue-400 bg-white ring-4 ring-blue-100 shadow-xl transform scale-105 z-10"; 
                            icon = <DollarSign size={24} className="text-blue-600"/>; 
                            label = "PAGAR AHORA"; 
                            labelColor = "text-blue-600"; 
                            action = () => onRegisterPayment(dueDate); 
                        }
                        else if (status === 'OVERDUE_NOW' || status === 'OVERDUE_FUTURE') { 
                            cardClass = "border-rose-200 bg-rose-50 shadow-sm"; 
                            icon = <AlertCircle size={24} className="text-rose-500"/>; 
                            label = "VENCIDO"; 
                            labelColor = "text-rose-600"; 
                            if(status === 'OVERDUE_NOW') action = () => onRegisterPayment(dueDate); 
                        }
                        else if (status === 'NA') { 
                            cardClass = "border-slate-100 bg-slate-100 opacity-40"; 
                            label = "-"; 
                            labelColor = "text-slate-300"; 
                            icon = <span/>; 
                        }

                        return (
                            <div key={monthIndex} className={`relative rounded-xl border p-4 flex flex-col justify-between h-32 transition-all duration-200 ${cardClass}`}>
                                <div className="flex justify-between items-start"><span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>{icon}</div>
                                <div className="mt-2">
                                    {status !== 'NA' && (
                                        <div className="flex flex-col gap-0.5">
                                           <div className="text-[10px] text-slate-500 font-medium">Vence: {formattedDueDate}</div>
                                           {status === 'PAID' && paymentDate && (
                                               <div className="text-[10px] text-emerald-700 font-bold">Pagado: {paymentDate}</div>
                                           )}
                                        </div>
                                    )}
                                    <div className={`font-extrabold text-sm mt-1 ${labelColor}`}>{label}</div>
                                </div>
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
