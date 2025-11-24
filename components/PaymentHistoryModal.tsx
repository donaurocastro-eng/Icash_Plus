import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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

  const parseDate = (d: string | Date) => {
      if (!d) return new Date();
      const dateObj = new Date(d);
      return new Date(dateObj.valueOf() + dateObj.getTimezoneOffset() * 60000);
  };

  const startDate = parseDate(contract.startDate);
  const nextPaymentDate = parseDate(contract.nextPaymentDate || contract.startDate);
  
  const today = new Date(); 
  const months = Array.from({ length: 12 }, (_, i) => i);

  const getMonthStatus = (monthIndex: number) => {
    const dueDate = new Date(year, monthIndex, contract.paymentDay);
    
    const currentMonthVal = year * 100 + monthIndex;
    const startMonthVal = startDate.getFullYear() * 100 + startDate.getMonth();
    const nextPayMonthVal = nextPaymentDate.getFullYear() * 100 + nextPaymentDate.getMonth();
    const todayMonthVal = today.getFullYear() * 100 + today.getMonth();

    if (currentMonthVal < startMonthVal) return 'NA'; 
    if (currentMonthVal < nextPayMonthVal) return 'PAID';
    
    if (currentMonthVal === nextPayMonthVal) {
        const isLate = today.getTime() > dueDate.getTime() && (today.getDate() > contract.paymentDay || todayMonthVal > currentMonthVal);
        return isLate ? 'OVERDUE_NOW' : 'DUE_NOW';
    }

    if (currentMonthVal < todayMonthVal) return 'OVERDUE_FUTURE'; 
    return 'FUTURE';
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Historial de Pagos</h3>
                <p className="text-sm text-slate-500">{contractLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex items-center justify-center py-4 gap-6 border-b border-slate-100 bg-white">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft/></button>
            <span className="text-2xl font-bold text-slate-800 w-24 text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight/></button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map(monthIndex => {
                    const status = getMonthStatus(monthIndex);
                    const monthName = new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                    const dueDate = new Date(year, monthIndex, contract.paymentDay);
                    const formattedDate = dueDate.toLocaleDateString();

                    let cardClass = "border-slate-200 bg-white opacity-60";
                    let icon = <Clock size={20} />;
                    let label = "Futuro";
                    let labelColor = "text-slate-400";
                    let action = null;

                    if (status === 'PAID') {
                        cardClass = "border-emerald-200 bg-emerald-50";
                        icon = <CheckCircle size={24} className="text-emerald-500"/>;
                        label = "PAGADO";
                        labelColor = "text-emerald-600";
                    } else if (status === 'DUE_NOW') {
                        cardClass = "border-blue-300 bg-white ring-2 ring-blue-400 shadow-lg transform scale-105 z-10";
                        icon = <DollarSignIcon className="text-blue-600"/>;
                        label = "PAGAR AHORA";
                        labelColor = "text-blue-600";
                        action = () => onRegisterPayment(dueDate);
                    } else if (status === 'OVERDUE_NOW' || status === 'OVERDUE_FUTURE') {
                        cardClass = "border-rose-200 bg-rose-50 shadow-sm";
                        icon = <AlertCircle size={24} className="text-rose-500"/>;
                        label = "VENCIDO";
                        labelColor = "text-rose-600";
                        if (status === 'OVERDUE_NOW') action = () => onRegisterPayment(dueDate);
                    } else if (status === 'NA') {
                        cardClass = "border-slate-100 bg-slate-50 opacity-40";
                        label = "-";
                        labelColor = "text-slate-300";
                    }

                    return (
                        <div key={monthIndex} className={`relative rounded-xl border p-4 flex flex-col justify-between h-32 transition-all duration-200 ${cardClass}`}>
                            <div className="flex justify-between items-start">
                                <span className="capitalize font-bold text-lg text-slate-700">{monthName}</span>
                                {icon}
                            </div>
                            
                            <div className="mt-2">
                                {status !== 'NA' && <div className="text-xs text-slate-500">Vence: {formattedDate}</div>}
                                <div className={`font-extrabold text-sm mt-1 ${labelColor}`}>{label}</div>
                            </div>

                            {action && (
                                <button 
                                    onClick={action}
                                    className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none"
                                    title="Click para pagar"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-500 justify-center font-medium">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Pagado</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full ring-1 ring-blue-300"></div> A Pagar (Click)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-500 rounded-full"></div> Vencido</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded-full"></div> Futuro</div>
        </div>
      </div>
    </div>
  );
};

const DollarSignIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${className}`}>
        <line x1="12" x2="12" y1="1" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
);

export default PaymentHistoryModal;