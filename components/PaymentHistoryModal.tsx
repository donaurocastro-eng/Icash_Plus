import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, DollarSign, CalendarCheck, Trash2, AlertTriangle, Loader, Tag, User, Home, FileText } from 'lucide-react';
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
  
  // Delete UI States
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && contract) {
      loadTransactions();
      setConfirmDeleteTxId(null);
    }
  }, [isOpen, contract, year]);

  const loadTransactions = async () => {
    if (!contract) return;
    setLoading(true);
    try {
        const all = await TransactionService.getAll();
        
        // Filter strictly by Contract Code if available (most accurate)
        const filtered = all.filter(t => {
            if (t.type !== 'INGRESO') return false;
            
            // Primary Link: Contract Code
            if (t.contractCode && t.contractCode === contract.code) return true;
            
            // Secondary Link: Property Code (Legacy support)
            if (contract.propertyCode && t.propertyCode === contract.propertyCode) {
                 // Check date range to ensure it belongs to this contract
                 const txDate = new Date(t.date);
                 const startDate = new Date(contract.startDate);
                 const endDate = contract.endDate ? new Date(contract.endDate) : new Date('2099-12-31');
                 return txDate >= startDate && txDate <= endDate;
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

  const handleRequestDelete = (txId: string) => {
      setConfirmDeleteTxId(txId);
  };

  const handleCancelDelete = () => {
      setConfirmDeleteTxId(null);
  };

  const handleConfirmDelete = async (txId: string) => {
      if (!onDeleteTransaction) return;
      
      setIsDeleting(true);
      try {
          await onDeleteTransaction(txId);
          await loadTransactions();
          setConfirmDeleteTxId(null);
      } catch (e) {
          console.error(e);
      } finally {
          setIsDeleting(false);
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
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  const findTransactionForMonth = (monthIndex: number, currentYear: number) => {
      const found = transactions.find(t => {
          // PRIORITY: Check billablePeriod first (e.g. "2025-08")
          if (t.billablePeriod && /^\d{4}-\d{2}$/.test(t.billablePeriod)) {
              const [bY, bM] = t.billablePeriod.split('-');
              return parseInt(bY) === currentYear && (parseInt(bM) - 1) === monthIndex;
          }
          
          // FALLBACK: Transaction Date (Legacy behavior or missing period)
          const [tYStr, tMStr] = t.date.split('-');
          const tYear = parseInt(tYStr);
          const tMonth = parseInt(tMStr) - 1;
          return tYear === currentYear && tMonth === monthIndex;
      });
      return found;
  };

  const getMonthStatus = (monthIndex: number, hasPayment: boolean) => {
    if (hasPayment) return 'PAID';

    const cellVal = year * 100 + monthIndex;
    const startVal = startDate.getFullYear() * 100 + startDate.getMonth();
    
    if (cellVal < startVal) return 'NA'; 

    const npDate = parseDate(contract.nextPaymentDate);
    const nextPayVal = npDate.getFullYear() * 100 + npDate.getMonth();
    const todayVal = today.getFullYear() * 100 + today.getMonth();

    if (cellVal < nextPayVal) return 'PAID_HISTORIC'; // Marked paid by contract date, but no transaction found

    const paymentDay = contract.paymentDay || 1;
    
    if (cellVal === nextPayVal) {
        const isPastDueDay = today.getDate() > paymentDay;
        if ((todayVal === cellVal && isPastDueDay) || todayVal > cellVal) return 'OVERDUE_NOW';
        return 'DUE_NOW';
    }
    
    if (cellVal < todayVal) return 'OVERDUE_FUTURE'; 
    
    return 'FUTURE';
  };

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
  };

  const formatMoney = (amount: number) => {
      return amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100 border border-slate-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Historial de Pagos</h3>
                <p className="text-sm text-slate-500 font-medium">{contractLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24}/></button>
        </div>

        {/* DEBUG INFO BAR */}
        <div className="bg-slate-800 text-slate-200 px-6 py-2 text-xs font-mono flex flex-wrap gap-4 items-center border-b border-slate-700">
            <div className="flex items-center gap-2">
                <FileText size={12} className="text-blue-400"/>
                <span className="opacity-50">Contrato:</span>
                <span className="text-white font-bold">{contract.code}</span>
            </div>
            <div className="flex items-center gap-2">
                <User size={12} className="text-emerald-400"/>
                <span className="opacity-50">Inquilino:</span>
                <span className="text-white font-bold">{contract.tenantCode}</span>
            </div>
            <div className="flex items-center gap-2">
                <Home size={12} className="text-amber-400"/>
                <span className="opacity-50">Unidad:</span>
                <span className="text-white font-bold">{contract.apartmentCode}</span>
            </div>
            <div className="flex-1 text-right text-slate-400 italic">
                Próximo Pago: {contract.nextPaymentDate}
            </div>
        </div>
        
        {/* YEAR SELECTOR */}
        <div className="flex items-center justify-center py-4 gap-6 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronLeft/></button>
            <span className="text-2xl font-bold text-slate-800 w-32 text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronRight/></button>
        </div>

        {/* MONTHS GRID */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            {loading && !isDeleting ? (
                 <div className="flex justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map(monthIndex => {
                        const transaction = findTransactionForMonth(monthIndex, year);
                        // If no transaction found, check if it SHOULD be paid based on contract logic
                        const status = getMonthStatus(monthIndex, !!transaction);
                        
                        const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                        const dueDate = new Date(year, monthIndex, contract.paymentDay);
                        const formattedDueDate = dueDate.toLocaleDateString();
                        
                        const paymentDateStr = transaction ? formatDate(transaction.date) : null;
                        const paymentAmountStr = transaction ? formatMoney(transaction.amount) : null;

                        const isConfirming = transaction && confirmDeleteTxId === transaction.code;

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
                        else if (status === 'PAID_HISTORIC') {
                            // Paid according to contract date, but transaction missing (Purged or old data)
                            cardClass = "border-emerald-100 bg-emerald-50/50 opacity-80 border-dashed"; 
                            icon = <CheckCircle size={24} className="text-emerald-300"/>; 
                            label = "PAGADO (Histórico)"; 
                            labelColor = "text-emerald-400"; 
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
                            if(status === 'OVERDUE_NOW' || status === 'OVERDUE_FUTURE') action = () => onRegisterPayment(dueDate); 
                        }
                        else if (status === 'NA') { 
                            cardClass = "border-slate-100 bg-slate-100 opacity-40"; 
                            label = "-"; 
                            labelColor = "text-slate-300"; 
                            icon = <span/>; 
                        }

                        return (
                            <div key={monthIndex} className={`relative rounded-xl border p-4 flex flex-col justify-between min-h-[140px] transition-all duration-200 ${cardClass}`}>
                                
                                {/* DELETE CONFIRMATION OVERLAY */}
                                {isConfirming && (
                                    <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center justify-center text-center animate-fadeIn border-2 border-red-100">
                                        {isDeleting ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader className="animate-spin text-red-500" size={24} />
                                                <span className="text-xs font-bold text-red-600">Eliminando...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-2 text-red-100 bg-red-600 p-2 rounded-full"><Trash2 size={16}/></div>
                                                <p className="text-xs font-bold text-slate-800 mb-1">¿Eliminar Pago?</p>
                                                <div className="flex gap-2 w-full mt-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleCancelDelete(); }} className="flex-1 py-1 bg-slate-100 text-slate-600 text-[10px] rounded font-bold">No</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleConfirmDelete(transaction!.code); }} className="flex-1 py-1 bg-red-600 text-white text-[10px] rounded font-bold">Si</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>
                                        <div className="flex items-center gap-2">
                                            {status === 'PAID' && transaction && onDeleteTransaction && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRequestDelete(transaction.code); }}
                                                    className="p-1.5 bg-white border border-emerald-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm z-10"
                                                    title="Eliminar este pago"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            )}
                                            {icon}
                                        </div>
                                    </div>
                                    
                                    {status !== 'NA' && (
                                        <div className="flex flex-col gap-1">
                                           <div className="text-[10px] text-slate-500 font-medium">Vence: {formattedDueDate}</div>
                                           
                                           {status === 'PAID' && transaction ? (
                                               <div className="mt-2 bg-white/80 p-2 rounded-lg border border-emerald-100 shadow-sm">
                                                   <div className="flex items-center gap-1.5 mb-0.5">
                                                       <CalendarCheck size={12} className="text-emerald-600"/>
                                                       <span className="text-xs text-emerald-800 font-bold">Pagado: {paymentDateStr}</span>
                                                   </div>
                                                   <div className="flex items-center gap-1.5">
                                                        <DollarSign size={12} className="text-emerald-600"/>
                                                        <span className="text-xs text-emerald-800 font-bold">{paymentAmountStr}</span>
                                                   </div>
                                                   <div className="text-[9px] text-slate-400 font-mono mt-1 text-right">Ref: {transaction.code}</div>
                                               </div>
                                           ) : null}
                                        </div>
                                    )}
                                </div>
                                
                                {status !== 'PAID' && (
                                    <div className={`font-extrabold text-sm mt-2 text-right ${labelColor}`}>{label}</div>
                                )}
                                
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