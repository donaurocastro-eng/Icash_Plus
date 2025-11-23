import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, DollarSign, Coins } from 'lucide-react';
import { Account, AccountFormData } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  editingAccount?: Account | null;
  isSubmitting: boolean;
}

const AccountModal: React.FC<AccountModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingAccount, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    bankName: '',
    accountNumber: '',
    type: 'ACTIVO',
    initialBalance: 0,
    currency: 'HNL'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        name: editingAccount.name,
        bankName: editingAccount.bankName,
        accountNumber: editingAccount.accountNumber,
        type: editingAccount.type,
        initialBalance: editingAccount.initialBalance,
        currency: editingAccount.currency
      });
    } else {
      setFormData({ 
        name: '', 
        bankName: '', 
        accountNumber: '', 
        type: 'ACTIVO', 
        initialBalance: 0, 
        currency: 'HNL' 
      });
    }
    setError(null);
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.bankName.trim() || !formData.accountNumber.trim()) {
      setError("Todos los campos marcados son obligatorios.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar la cuenta.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {editingAccount ? `Modificando ${editingAccount.code}` : 'El código se generará automáticamente'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Tipo de Cuenta */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${formData.type === 'ACTIVO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'ACTIVO'})}
            >
              Activo
            </div>
            <div 
              className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${formData.type === 'PASIVO' ? 'bg-red-50 border-red-500 text-red-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'PASIVO'})}
            >
              Pasivo
            </div>
          </div>

          {/* Moneda */}
          <div className="space-y-1">
             <label className="block text-sm font-medium text-slate-700">Moneda</label>
             <div className="grid grid-cols-2 gap-4">
              <div 
                className={`flex items-center justify-center space-x-2 cursor-pointer border rounded-lg p-3 transition-all ${formData.currency === 'HNL' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setFormData({...formData, currency: 'HNL'})}
              >
                <Coins size={16} />
                <span>Lempiras (HNL)</span>
              </div>
              <div 
                className={`flex items-center justify-center space-x-2 cursor-pointer border rounded-lg p-3 transition-all ${formData.currency === 'USD' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setFormData({...formData, currency: 'USD'})}
              >
                <DollarSign size={16} />
                <span>Dólares (USD)</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre de la Cuenta</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="Ej: Nómina Principal"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Banco</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                placeholder="Ej: BBVA"
                value={formData.bankName}
                onChange={e => setFormData({...formData, bankName: e.target.value})}
              />
            </div>
             <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Saldo Inicial</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                  {formData.currency === 'HNL' ? 'L' : '$'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow font-mono"
                  placeholder="0.00"
                  value={formData.initialBalance}
                  onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Número de Cuenta</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="Ej: 0011-2233-44-556677"
              value={formData.accountNumber}
              onChange={e => setFormData({...formData, accountNumber: e.target.value})}
            />
          </div>

          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;