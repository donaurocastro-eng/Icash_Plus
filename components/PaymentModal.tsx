import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { Contract, PaymentFormData, Account } from '../types';
import { AccountService } from '../services/accountService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  contract: Contract | null;
  contractLabel: string;
  initialDescription: string;
  isSubmitting: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  contractLabel,
  initialDescription,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    contractCode: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    accountCode: '',
    description: ''
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contract) {
      loadAccounts();
      
      // LOGIC: Use contract next payment date as default, fallback to today
      let defaultDate = new Date().toISOString().split('T')[0];
      if (contract.nextPaymentDate) {
          // Ensure we handle the string YYYY-MM-DD correctly without timezone shifts
          // If the string is already YYYY-MM-DD, we use it directly.
          if (contract.nextPaymentDate.length === 10) {
              defaultDate = contract.nextPaymentDate;
          } else {
              // If it's a full ISO string
              defaultDate = contract.nextPaymentDate.split('T')[0];
          }
      }

      setFormData({
        contractCode: contract.code,
        date: defaultDate,
        amount: contract.amount,
        accountCode: '',
        description: initialDescription
      });
      setError(null);
    }
  }, [isOpen, contract, initialDescription]);

  const loadAccounts = async () => {
    try {
      const data = await AccountService.getAll();
      setAccounts(data);
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Registrar Pago</h3>
            <p className="text-xs text-slate-500">{contractLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center"><AlertCircle size={16} className="mr-2 shrink-0" />{error}</div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700">Fecha de Pago (Vencimiento)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700">Monto a Pagar</label>
            <div className="relative">
               {/* Removed DollarSign icon as requested */}
               <input 
                 type="number" 
                 step="0.01" 
                 className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xl font-bold text-slate-800"
                 value={formData.amount} 
                 onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
               />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700">Cuenta de Destino</label>
             <div className="relative">
               <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <select 
                 className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700"
                 value={formData.accountCode} 
                 onChange={e => setFormData({...formData, accountCode: e.target.value})}
               >
                 <option value="">Seleccionar Cuenta...</option>
                 {accounts.map(acc => (
                   <option key={acc.code} value={acc.code}>{acc.name} ({acc.currency})</option>
                 ))}
               </select>
             </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700">Descripción</label>
            <textarea 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none text-sm"
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
                Cancelar
            </button>
            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold hover:bg-indigo-700 transition-all flex justify-center items-center disabled:opacity-70 disabled:shadow-none"
            >
               {isSubmitting ? (
                   <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
               ) : (
                   <>
                       <Save size={18} className="mr-2"/> Registrar
                   </>
               )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;