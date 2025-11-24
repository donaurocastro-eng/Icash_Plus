import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, DollarSign, Calendar, Wallet } from 'lucide-react';
import { Contract, Account, PaymentFormData } from '../types';
import { AccountService } from '../services/accountService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  contract: Contract | null;
  contractLabel: string;
  initialDescription?: string;
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
      setFormData({
        contractCode: contract.code,
        date: new Date().toISOString().split('T')[0],
        amount: contract.amount, 
        accountCode: '',
        description: initialDescription || `Pago Alquiler - ${contractLabel}`
      });
      setError(null);
    }
  }, [isOpen, contract, initialDescription]);

  const loadAccounts = async () => {
    try {
      const data = await AccountService.getAll();
      setAccounts(data.filter(a => a.type === 'ACTIVO'));
    } catch (err) { console.error(err); }
  };

  if (!isOpen || !contract) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountCode || !formData.date) {
      setError("Monto, Fecha y Cuenta de Destino son obligatorios.");
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al registrar pago.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
          <div>
            <h3 className="text-lg font-bold text-emerald-800">Registrar Pago de Alquiler</h3>
            <p className="text-xs text-emerald-600 mt-1">{contractLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center"><AlertCircle size={16} className="mr-2 shrink-0" />{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha de Pago</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
             </div>
             <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Monto Recibido</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" step="0.01" className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                        value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
             </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Cuenta de Destino (Caja/Banco)</label>
            <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.accountCode}
                    onChange={e => setFormData({...formData, accountCode: e.target.value})}
                >
                    <option value="">Seleccionar Cuenta...</option>
                    {accounts.map(a => (
                        <option key={a.code} value={a.code}>{a.name} ({a.currency})</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Descripción</label>
            <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="pt-2 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md disabled:opacity-50">
                {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;