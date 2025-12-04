
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
  }, [isOpen, contract, year]);

  const loadTransactions = async () => {
    if (!contract) return;
    setLoading(true);
    try {
        const all = await TransactionService.getAll();
        // Filtramos transacciones relevantes (Ingresos de este contrato o propiedad)
        const filtered = all.filter(t => {
            if (t.type !== 'INGRESO') return false;
            
            // 1. Coincidencia Exacta por Código de Contrato
            if (t.contractCode === contract.code) return true;
            
            // 2. Coincidencia por Propiedad (Fallback importante)
            if (contract.propertyCode && t.propertyCode === contract.propertyCode) return true;

            // 3. Coincidencia laxa por descripción (último recurso)
            if (t.description.toLowerCase().includes(contractLabel.toLowerCase())) return true;
            
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
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Lógica de búsqueda "Inteligente"
  const findTransactionForMonth = (monthIndex: number, currentYear: number) => {
      // Prioridad 1: Coincidencia de Fecha (Año y Mes) estricta
      // Buscamos cualquier transacción que caiga en este mes y año asociados al contrato/propiedad
      const found = transactions.find(t => {
          const [tYStr, tMStr] = t.date.split('-');
          const tYear = parseInt(tYStr);
          const tMonth = parseInt(tMStr) - 1;

          if (tYear === currentYear && tMonth === monthIndex) {
              return true;
          }
          return false;
      });

      return found;
  };

  const getMonthStatus = (monthIndex: number, hasPayment: boolean) => {
    // Si encontramos una transacción real, ESTÁ PAGADO, sin importar qué diga el contrato.
    if (hasPayment) return 'PAID';

    const cellVal = year * 100 + monthIndex;
    const startVal = startDate.getFullYear() * 100 + startDate.getMonth();
    
    // Ignorar meses anteriores al inicio del contrato
    if (cellVal < startVal) return 'NA'; 

    const npDate = parseDate(contract.nextPaymentDate);
    const nextPayVal = npDate.getFullYear() * 100 + npDate.getMonth();
    const todayVal = today.getFullYear() * 100 + today.getMonth();

    // Si el mes consultado es ANTERIOR a la fecha de "Próximo Pago" guardada en BD,
    // y no encontramos transacción, igual asumimos pagado (histórico antiguo).
    if (cellVal < nextPayVal) return 'PAID';

    const paymentDay = contract.paymentDay || 1;
    
    if (cellVal === nextPayVal) {
        // Es el mes que toca pagar según la BD
        const isPastDueDay = today.getDate() > paymentDay;
        
        // Si estamos en este mes, pero ya pasó el día...
        if (todayVal === cellVal && isPastDueDay) return 'OVERDUE_NOW';
        // Si ya pasó el mes (todayVal > cellVal), es mora
        if (todayVal > cellVal) return 'OVERDUE_NOW';
        
        return 'DUE_NOW';
    }
    
    // Si la fecha de contrato se quedó atrás (cellVal < todayVal) y no hay pago => Mora
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
                        const paymentAmountStr = transaction ? formatMoney(transaction.amount) : null;

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
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>
                                        {icon}
                                    </div>
                                    
                                    {status !== 'NA' && (
                                        <div className="flex flex-col gap-1">
                                           <div className="text-[10px] text-slate-500 font-medium">Vence: {formattedDueDate}</div>
                                           
                                           {/* MOSTRAR DATOS REALES DE PAGO */}
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
