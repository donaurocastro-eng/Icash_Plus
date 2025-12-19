
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, CreditCard, Clock, FileText } from 'lucide-react';
import { Contract, PaymentFormData, Account } from '../types';
import { AccountService } from '../services/accountService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  contract: Contract | null;
  contractLabel: string;
  initialDescription: string;
  initialAmount?: number;
  initialDate?: Date;
  isSubmitting: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  contractLabel,
  initialDescription,
  initialAmount,
  initialDate,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    contractCode: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    accountCode: '',
    description: '',
    billablePeriod: ''
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [periodDisplay, setPeriodDisplay] = useState('');

  useEffect(() => {
    if (isOpen && contract) {
      loadAccounts();
      
      let targetDateStr = '';
      let dateForDisplay: Date;
      
      if (initialDate) {
          const y = initialDate.getFullYear();
          const m = String(initialDate.getMonth() + 1).padStart(2, '0');
          const d = String(initialDate.getDate()).padStart(2, '0');
          targetDateStr = `${y}-${m}-${d}`;
          dateForDisplay = initialDate;
      } else if (contract.nextPaymentDate) {
          targetDateStr = contract.nextPaymentDate.length >= 10 
              ? contract.nextPaymentDate.substring(0, 10) 
              : new Date().toISOString().split('T')[0];
          dateForDisplay = new Date(targetDateStr);
          dateForDisplay = new Date(dateForDisplay.valueOf() + dateForDisplay.getTimezoneOffset() * 60000);
      } else {
          targetDateStr = new Date().toISOString().split('T')[0];
          dateForDisplay = new Date();
      }
      
      const billablePeriod = targetDateStr.substring(0, 7);
      const monthName = dateForDisplay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      setPeriodDisplay(displayMonth);

      setFormData({
        contractCode: contract.code,
        date: targetDateStr, 
        amount: initialAmount !== undefined ? initialAmount : contract.amount,
        accountCode: '',
        description: initialDescription,
        billablePeriod: billablePeriod 
      });
      setError(null);
    }
  }, [isOpen, contract, initialDescription, initialAmount, initialDate]);

  const loadAccounts = async () => {
    try {
      const data = await AccountService.getAll();
      setAccounts(data.filter(a => a.type === 'ACTIVO')); 
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountCode || !formData.description) {
      setError("Monto, Cuenta y Descripción son obligatorios.");
      return;
    }
    await onSubmit(formData);
  };

  if (!isOpen || !contract) return null;

  const formatMoney = (amt: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amt);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[95vh] flex flex-col">
        
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800">Registrar Pago</h3>
            <p className="text-[10px] text-slate-500 truncate max-w-[250px]">{contractLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg flex items-center"><AlertCircle size={14} className="mr-2 shrink-0" />{error}</div>
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-full text-indigo-600 shadow-sm shrink-0">
                    <Clock size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide">Periodo a Cancelar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-indigo-900 leading-tight truncate">{periodDisplay}</p>
                        <span className="text-[9px] text-indigo-400 bg-indigo-100/50 px-1.5 rounded border border-indigo-100 truncate">
                            Mes del Contrato
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Fecha Recibo</label>
                    <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="date" 
                        className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 text-sm"
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                    />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Monto</label>
                    <div className="relative">
                    <input 
                        type="number" 
                        step="0.01" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-lg font-bold text-slate-800 text-right"
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                    />
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Cuenta de Destino</label>
                <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono text-xs"
                    value={formData.accountCode} 
                    onChange={e => setFormData({...formData, accountCode: e.target.value})}
                >
                    <option value="">Seleccionar Cuenta...</option>
                    {accounts.map(acc => (
                    <option key={acc.code} value={acc.code}>{acc.name} ({acc.currency}) - Saldo: {formatMoney(acc.currentBalance ?? 0)}</option>
                    ))}
                </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nota / Descripción</label>
                <textarea 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none text-xs leading-relaxed"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                />
            </div>

            <div className="pt-2 flex gap-3">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold hover:bg-indigo-700 transition-all flex justify-center items-center disabled:opacity-70 disabled:shadow-none text-sm"
                >
                {isSubmitting ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                    <>
                        <Save size={16} className="mr-2"/> Confirmar
                    </>
                )}
                </button>
            </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
