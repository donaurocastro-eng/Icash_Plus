import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { Contract } from '../types';

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

  const getMonthStatus = (monthIndex: number) => {
    const paymentDay = contract.paymentDay || 1;
    const dueDate = new Date(year, monthIndex, paymentDay);
    
    const cellVal = year * 100 + monthIndex;
    const startVal = startDate.getFullYear() * 100 + startDate.getMonth();
    const nextPayVal = nextPaymentDate.getFullYear() * 100 + nextPaymentDate.getMonth();
    const todayVal = today.getFullYear() * 100 + today.getMonth();

    if (cellVal < startVal) return 'NA'; 
    if (cellVal < nextPayVal) return 'PAID';
    
    if (cellVal === nextPayVal) {
        const isPastDueDay = today.getDate() > paymentDay;
        const isPastDueMonth = todayVal > cellVal;
        
        if (isPastDueMonth || (todayVal === cellVal && isPastDueDay)) {
            return 'OVERDUE_NOW';
        }
        return 'DUE_NOW';
    }

    if (cellVal < todayVal) return 'OVERDUE_FUTURE'; 
    return 'FUTURE';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100 border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Historial de Pagos</h3>
                <p className="text-sm text-slate-500 font-medium">{contractLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={24}/>
            </button>
        </div>

        <div className="flex items-center justify-center py-4 gap-6 border-b border-slate-100 bg-white shadow-sm z-10">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                <ChevronLeft/>
            </button>
            <span className="text-2xl font-bold text-slate-800 w-32 text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                <ChevronRight/>
            </button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map(monthIndex => {
                    const status = getMonthStatus(monthIndex);
                    const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                    const dueDate = new Date(year, monthIndex, contract.paymentDay);
                    const formattedDate = dueDate.toLocaleDateString();

                    let cardClass = "border-slate-200 bg-white opacity-60";
                    let icon = <Clock size={20} className="text-slate-300" />;
                    let label = "Futuro";
                    let labelColor = "text-slate-400";
                    let action = null;

                    if (status === 'PAID') {
                        cardClass = "border-emerald-200 bg-emerald-50";
                        icon = <CheckCircle size={24} className="text-emerald-500"/>;
                        label = "PAGADO";
                        labelColor = "text-emerald-600";
                    } else if (status === 'DUE_NOW') {
                        cardClass = "border-blue-400 bg-white ring-4 ring-blue-100 shadow-xl transform scale-105 z-10 cursor-pointer hover:bg-blue-50 transition-colors";
                        icon = <DollarSign size={24} className="text-blue-600"/>;
                        label = "PAGAR AHORA";
                        labelColor = "text-blue-600";
                        action = () => onRegisterPayment(dueDate);
                    } else if (status === 'OVERDUE_NOW' || status === 'OVERDUE_FUTURE') {
                        cardClass = "border-rose-200 bg-rose-50 shadow-sm cursor-pointer hover:bg-rose-100 transition-colors";
                        icon = <AlertCircle size={24} className="text-rose-500"/>;
                        label = "VENCIDO";
                        labelColor = "text-rose-600";
                        if (status === 'OVERDUE_NOW') action = () => onRegisterPayment(dueDate);
                    } else if (status === 'NA') {
                        cardClass = "border-slate-100 bg-slate-100 opacity-40";
                        label = "-";
                        labelColor = "text-slate-300";
                        icon = <span/>;
                    }

                    return (
                        <div 
                            key={monthIndex} 
                            onClick={action ? action : undefined}
                            className={`relative rounded-xl border p-4 flex flex-col justify-between h-32 transition-all duration-200 ${cardClass}`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>
                                {icon}
                            </div>
                            
                            <div className="mt-2">
                                {status !== 'NA' && <div className="text-xs text-slate-500 font-medium">Vence: {formattedDate}</div>}
                                <div className={`font-extrabold text-sm mt-1 ${labelColor}`}>{label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;