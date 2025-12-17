import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, DollarSign, Calendar, Trash2, Hash, User } from 'lucide-react';
import { Contract, Transaction, ContractPrice } from '../types';
import { TransactionService } from '../services/transactionService';
import { ContractService } from '../services/contractService';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  contractLabel: string;
  tenantName?: string;
  unitName?: string;
  onRegisterPayment: (monthDate: Date, amount?: number) => void;
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
  const [priceHistory, setPriceHistory] = useState<ContractPrice[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Delete UI States
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && contract) {
      loadData();
      setConfirmDeleteTxId(null);
    }
  }, [isOpen, contract, year]);

  const loadData = async () => {
    if (!contract) return;
    setLoading(true);
    try {
        const [allTxs, history] = await Promise.all([
            TransactionService.getAll(),
            ContractService.getPriceHistory(contract.code)
        ]);
        
        // Filter transactions strictly by Contract Code
        const filteredTxs = allTxs.filter(t => {
            if (t.type !== 'INGRESO') return false;
            return t.contractCode === contract.code;
        });
        
        setTransactions(filteredTxs);
        setPriceHistory(history);
    } catch (e) {
        console.error("Error loading history data", e);
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
          await loadData(); // Reload all data
          setConfirmDeleteTxId(null);
      } catch (e) {
          console.error(e);
      } finally {
          setIsDeleting(false);
      }
  };

  // Helper to find the correct price for a specific date
  const getHistoricalPrice = (date: Date): number => {
      if (!contract) return 0;
      if (priceHistory.length === 0) return contract.amount;

      // Construct comparable string YYYY-MM-DD
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      // priceHistory is sorted by startDate DESC (newest first).
      // Find the first record that started on or before the target date.
      const match = priceHistory.find(p => p.startDate <= dateStr);

      return match ? match.amount : contract.amount;
  };

  const formatMoney = (amount: number) => {
      return amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 0 });
  };

  const getPriceRangesString = () => {
      if (!contract) return '';
      
      const ranges: { start: number, end: number, amount: number }[] = [];
      let currentRange: { start: number, end: number, amount: number } | null = null;

      for (let m = 0; m < 12; m++) {
          const date = new Date(year, m, contract.paymentDay || 1);
          const price = getHistoricalPrice(date);

          if (!currentRange) {
              currentRange = { start: m, end: m, amount: price };
          } else {
              if (currentRange.amount === price) {
                  currentRange.end = m;
              } else {
                  ranges.push(currentRange);
                  currentRange = { start: m, end: m, amount: price };
              }
          }
      }
      if (currentRange) ranges.push(currentRange);

      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

      return ranges.map(r => {
          const startName = monthNames[r.start];
          const endName = monthNames[r.end];
          const rangeLabel = r.start === r.end ? startName : `${startName}-${endName}`;
          return `${rangeLabel} ${formatMoney(r.amount)}`;
      }).join(' / ');
  };

  if (!isOpen || !contract) return null;

  const startDate = new Date(contract.startDate);
  // Adjust for timezone if needed, but simple new Date(str) is usually local.
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Helper to get formatted period string "YYYY-MM"
  const getPeriodString = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

  const calculateMonthStatus = (monthIndex: number, currentYear: number) => {
      // 1. Calculate Due Date First to determine Price
      const paymentDay = contract.paymentDay || 1;
      
      // FIX: Calcular el último día del mes real para evitar desbordamiento (ej. 31 Nov -> 1 Dic)
      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
      const safeDay = Math.min(paymentDay, daysInMonth);
      
      // FIX: Crear fecha a las 12:00:00 (Mediodía) para evitar problemas de zona horaria al pasar la fecha
      const dueDate = new Date(currentYear, monthIndex, safeDay, 12, 0, 0);
      
      // 2. Get Dynamic Price for this specific month
      const monthlyAmount = getHistoricalPrice(dueDate);

      const periodStr = getPeriodString(currentYear, monthIndex);
      
      // 3. Find transactions
      const monthTransactions = transactions.filter(t => t.billablePeriod === periodStr);
      
      // Fallback legacy check
      const legacyTransactions = transactions.filter(t => {
          if (t.billablePeriod) return false;
          const [tYStr, tMStr] = t.date.split('-');
          return parseInt(tYStr) === currentYear && (parseInt(tMStr) - 1) === monthIndex;
      });

      const allTxs = [...monthTransactions, ...legacyTransactions];
      
      // 4. Sum amounts
      const totalPaid = allTxs.reduce((sum, t) => sum + t.amount, 0);
      
      // 5. Get Payment Date
      const paymentDate = allTxs.length > 0 ? allTxs[0].date : null;

      // 6. Determine Status
      let status = 'FUTURE';
      
      const cellDate = new Date(currentYear, monthIndex, 1);
      const contractStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
      // If before contract start
      if (cellDate < contractStartMonth) return { status: 'NA', totalPaid: 0, paymentDate: null, txs: [], monthlyAmount };

      // Status Logic with Tolerance (0.01)
      if (totalPaid >= monthlyAmount - 0.01) {
          status = 'PAID';
      } else if (totalPaid > 0) {
          status = 'PARTIAL';
      } else {
          // No payment yet
          dueDate.setHours(23, 59, 59, 999);

          if (today > dueDate) {
              status = 'OVERDUE';
          } else {
              const todayStart = new Date(today.getFullYear(), today.getMonth(), 1);
              if (cellDate.getTime() === todayStart.getTime()) {
                  status = 'DUE_NOW'; 
              } else {
                  status = 'FUTURE';
              }
          }
      }

      return { status, totalPaid, paymentDate, txs: allTxs, monthlyAmount, dueDate };
  };

  const formatDateShort = (dateStr: string | null) => {
      if (!dateStr) return '-';
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* HEADER */}
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Control de Pagos</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <Hash size={12} className="text-slate-400"/>
                        <span className="font-mono font-bold text-slate-800">{contract.code}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <User size={12} className="text-slate-400"/>
                        <span className="font-mono font-bold text-slate-800">{contract.tenantCode}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-medium">{tenantName}</span>
                    </div>
                    {/* Updated Price Range Display */}
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <Calendar size={12} className="text-slate-400 mr-1"/>
                        <span className="font-medium text-slate-700 mr-1">{year}:</span>
                        <span className="font-bold text-emerald-600">{getPriceRangesString()}</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={20}/></button>
        </div>
        
        {/* YEAR SELECTOR */}
        <div className="flex items-center justify-center py-2 gap-4 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={20}/></button>
            <span className="text-lg font-bold text-slate-800 w-24 text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight size={20}/></button>
        </div>

        {/* MONTHS GRID */}
        <div className="p-4 overflow-y-auto bg-slate-50/50 flex-1">
            {loading && !isDeleting ? (
                 <div className="flex justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {months.map(monthIndex => {
                        const { status, totalPaid, paymentDate, txs, monthlyAmount, dueDate } = calculateMonthStatus(monthIndex, year);
                        
                        const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
                        
                        const dueDateShort = `${dueDate.getDate().toString().padStart(2,'0')}/${(dueDate.getMonth()+1).toString().padStart(2,'0')}/${dueDate.getFullYear()}`;

                        // Card Styles
                        let cardClass = "bg-white border-slate-200 opacity-60";
                        let statusIcon = <Clock size={14} className="text-slate-300" />;
                        let statusText = "PENDIENTE";
                        let statusColor = "text-slate-400";
                        let action = null;

                        const remainingAmount = Math.max(0, monthlyAmount - totalPaid);

                        if (status === 'PAID') { 
                            cardClass = "bg-emerald-50 border-emerald-200 opacity-100 ring-1 ring-emerald-100"; 
                            statusIcon = <CheckCircle size={16} className="text-emerald-500"/>; 
                            statusText = "PAGADO";
                            statusColor = "text-emerald-700 bg-emerald-100/50 border-emerald-100";
                        }
                        else if (status === 'PARTIAL') {
                            cardClass = "bg-orange-50 border-orange-200 opacity-100"; 
                            statusIcon = <AlertCircle size={16} className="text-orange-500"/>; 
                            statusText = "PARCIAL";
                            statusColor = "text-orange-700 bg-orange-100 border-orange-200";
                            action = () => onRegisterPayment(dueDate, remainingAmount);
                        }
                        else if (status === 'DUE_NOW') { 
                            cardClass = "bg-white border-blue-300 ring-2 ring-blue-100 shadow-md opacity-100 transform scale-[1.02] z-10"; 
                            statusIcon = <DollarSign size={16} className="text-blue-500"/>; 
                            statusText = "COBRAR";
                            statusColor = "text-blue-700 bg-blue-50 border-blue-100";
                            action = () => onRegisterPayment(dueDate, monthlyAmount);
                        }
                        else if (status === 'OVERDUE') { 
                            cardClass = "bg-rose-50 border-rose-200 shadow-sm opacity-100"; 
                            statusIcon = <AlertCircle size={16} className="text-rose-500"/>; 
                            statusText = "VENCIDO";
                            statusColor = "text-rose-700 bg-rose-100/50 border-rose-100";
                            action = () => onRegisterPayment(dueDate, monthlyAmount);
                        }
                        else if (status === 'NA') {
                            cardClass = "bg-slate-50 border-slate-100 opacity-30 grayscale";
                            statusText = "-";
                        }

                        return (
                            <div key={monthIndex} className={`relative rounded-lg border p-2.5 flex flex-col justify-between min-h-[110px] transition-all ${cardClass}`}>
                                
                                {/* Header Row */}
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-xs text-slate-700">{monthName}</span>
                                    <div className="flex items-center gap-1">
                                        {/* Delete Button (Only if paid/partial) */}
                                        {txs.length > 0 && onDeleteTransaction && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRequestDelete(txs[0].code); }}
                                                className="p-1 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded transition-colors z-20"
                                                title="Borrar pago"
                                            >
                                                <Trash2 size={12}/>
                                            </button>
                                        )}
                                        {statusIcon}
                                    </div>
                                </div>

                                {/* Info Rows */}
                                {status !== 'NA' && (
                                    <div className="space-y-1 text-[10px]">
                                        {/* Row: Due Date */}
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Vence:</span>
                                            <span className="font-mono">{dueDateShort}</span>
                                        </div>

                                        {/* Row: Payment Date (Only if paid) */}
                                        {(status === 'PAID' || status === 'PARTIAL') && paymentDate ? (
                                            <div className="flex justify-between items-center text-slate-700 font-bold">
                                                <span>Pagado:</span>
                                                <span className="font-mono">{formatDateShort(paymentDate)}</span>
                                            </div>
                                        ) : (
                                            <div className="h-[15px]"></div> // Spacer
                                        )}

                                        <div className="border-t border-black/5 my-1"></div>

                                        {/* Row: Amounts */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Contrato:</span>
                                            {/* Aquí se muestra el monto calculado dinámicamente */}
                                            <span className="font-mono">{formatMoney(monthlyAmount)}</span>
                                        </div>
                                        {(status === 'PAID' || status === 'PARTIAL') && (
                                            <div className={`flex justify-between items-center font-bold ${status === 'PAID' ? 'text-emerald-700' : 'text-orange-600'}`}>
                                                <span>Abono:</span>
                                                <span className="font-mono">{formatMoney(totalPaid)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Overlay */}
                                {action && <button onClick={action} className="absolute inset-0 w-full h-full cursor-pointer rounded-lg z-10" title="Click para gestionar"></button>}

                                {/* DELETE CONFIRMATION OVERLAY */}
                                {isConfirmingDelete(txs) && (
                                    <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-2 text-center animate-fadeIn border border-red-200">
                                        <p className="text-[10px] font-bold text-slate-800 mb-1.5 leading-tight">¿Borrar pago?</p>
                                        <div className="flex gap-1.5 w-full">
                                            <button onClick={(e) => { e.stopPropagation(); handleCancelDelete(); }} className="flex-1 py-1 bg-slate-100 text-slate-600 text-[9px] rounded font-bold hover:bg-slate-200">No</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleConfirmDelete(confirmDeleteTxId!); }} className="flex-1 py-1 bg-red-600 text-white text-[9px] rounded font-bold hover:bg-red-700">Si</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );

  function isConfirmingDelete(txs: Transaction[]) {
      return confirmDeleteTxId && txs.some(t => t.code === confirmDeleteTxId);
  }
};

export default PaymentHistoryModal;