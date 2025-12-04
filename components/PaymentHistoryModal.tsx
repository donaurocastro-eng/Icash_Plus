
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, DollarSign, CalendarCheck } from 'lucide-react';
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
        const all = await TransactionService.getAll();
        
        // Filter transactions related to this contract
        const filtered = all.filter(t => {
            // 1. Exact match by contract code (Best)
            if (t.contractCode && t.contractCode === contract.code) return true;
            
            // 2. Fallback: Match by Property and Type 'INGRESO'
            // Only if contract has a propertyCode associated
            if (contract.propertyCode && t.propertyCode === contract.propertyCode && t.type === 'INGRESO') {
                return true;
            }
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
      // Adjust for timezone offset to treat YYYY-MM-DD as local
      return new Date(dateObj.valueOf() + dateObj.getTimezoneOffset() * 60000);
  };

  const startDate = parseDate(contract.startDate);
  const nextPaymentDate = parseDate(contract.nextPaymentDate || contract.startDate);
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Helper to find actual payment date for a specific month/year
  const findTransactionForMonth = (monthIndex: number, currentYear: number) => {
      const monthDate = new Date(currentYear, monthIndex, 1);
      const monthName = monthDate.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
      
      const found = transactions.find(t => {
          const tDate = new Date(t.date); // This is UTC midnight from ISO string
          // We need to parse YYYY, MM from the ISO string to be safe
          const [tYStr, tMStr] = t.date.split('-');
          const tYear = parseInt(tYStr);
          const tMonth = parseInt(tMStr) - 1; // 0-indexed

          // 1. If contract code matches (strong link), trust the date
          if (t.contractCode === contract.code) {
               // Logic A: Transaction Date is in the target month/year
               if (tYear === currentYear && tMonth === monthIndex) return true;

               // Logic B: Description explicit match (fallback if date is off, e.g. paid early)
               const desc = t.description.toLowerCase();
               if (desc.includes(monthName) && (desc.includes(currentYear.toString()) || tYear === currentYear)) return true;
          }

          // 2. Weak link (legacy or missing contract code)
          // Must match property/unit AND description
          const desc = t.description.toLowerCase();
          if (desc.includes(monthName)) {
             if (!desc.includes(currentYear.toString())) {
                 // If year is not in desc, assume transaction year match is required
                 if (tYear !== currentYear) return false;
             }
             return true;
          }
          return false;
      });

      return found;
  };

  const getMonthStatus = (monthIndex: number, hasPayment: boolean) => {
    // Priority: If payment found, it is PAID.
    if (hasPayment) return 'PAID';

    const paymentDay = contract.paymentDay || 1;
    
    // Create comparable integers YYYYMM
    const cellVal = year * 100 + monthIndex;
    const startVal = startDate.getFullYear() * 100 + startDate.getMonth();
    const nextPayVal = nextPaymentDate.getFullYear() * 100 + nextPaymentDate.getMonth();
    const todayVal = today.getFullYear() * 100 + today.getMonth();

    if (cellVal < startVal) return 'NA'; 
    
    // If it's before the "Next Payment Date" recorded in contract, assume it was paid (legacy logic)
    // BUT checking hasPayment above is safer. We'll keep this as fallback for migrated data without txs.
    if (cellVal < nextPayVal) return 'PAID'; 
    
    if (cellVal === nextPayVal) {
        // This is the month pending payment
        const isPastDueDay = today.getDate() > paymentDay;
        
        if (todayVal > cellVal) return 'OVERDUE_NOW'; // We are in a future month relative to this cell
        if (todayVal === cellVal && isPastDueDay) return 'OVERDUE_NOW'; // Same month, day passed
        return 'DUE_NOW';
    }
    
    // Future months relative to next payment date
    if (cellVal < todayVal) return 'OVERDUE_FUTURE'; 
    return 'FUTURE';
  };

  const formatDate = (dateStr: string) => {
      const parts = dateStr.split('-'); // YYYY-MM-DD
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100 border border-slate-200">
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
                        const transaction = findTransactionForMonth(monthIndex, year);
                        const status = getMonthStatus(monthIndex, !!transaction);
                        
                        const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                        const dueDate = new Date(year, monthIndex, contract.paymentDay);
                        const formattedDueDate = dueDate.toLocaleDateString();
                        const paymentDateStr = transaction ? formatDate(transaction.date) : null;

                        let cardClass = "border-slate-200 bg-white opacity-60", icon = <Clock size={20} className="text-slate-300" />, label = "Futuro", labelColor = "text-slate-400", action = null;

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
                        else if (status === 'OVERDUE_NOW' || status === 'OVERDUE_FUTURE') { 
                            cardClass = "border-rose-200 bg-rose-50 shadow-sm opacity-100"; 
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
                            <div key={monthIndex} className={`relative rounded-xl border p-4 flex flex-col justify-between h-40 transition-all duration-200 ${cardClass}`}>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>
                                        {icon}
                                    </div>
                                    
                                    {status !== 'NA' && (
                                        <div className="flex flex-col gap-1">
                                           <div className="text-[10px] text-slate-500 font-medium">Vence: {formattedDueDate}</div>
                                           
                                           {/* PAYMENT DATE DISPLAY */}
                                           {status === 'PAID' && (
                                               <div className="mt-2 flex items-center gap-1.5 bg-white/80 px-2 py-1.5 rounded border border-emerald-200 shadow-sm">
                                                   <CalendarCheck size={14} className="text-emerald-600"/>
                                                   <div className="text-xs text-emerald-800 font-bold">
                                                       {paymentDateStr ? `Pagado: ${paymentDateStr}` : 'Pagado'}
                                                   </div>
                                               </div>
                                           )}
                                        </div>
                                    )}
                                </div>
                                <div className={`font-extrabold text-sm mt-1 text-right ${labelColor}`}>{label}</div>
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
