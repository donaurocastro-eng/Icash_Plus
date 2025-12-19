
import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, DollarSign, Coins, Building2, Hash, LayoutTemplate, TrendingUp, TrendingDown } from 'lucide-react';
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
    if (!formData.name.trim() || !formData.bankName.trim()) {
      setError("El nombre y el banco son obligatorios.");
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
      {/* Backdrop con blur */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[95vh] overflow-y-auto border border-slate-200">
        
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {editingAccount ? 'Modifica los detalles de tu cuenta' : 'Ingresa los datos para comenzar'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-600 text-sm p-4 rounded-xl flex items-start shadow-sm border border-rose-100">
              <AlertCircle size={18} className="mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECCIÓN 1: TIPO DE CUENTA */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Cuenta</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'ACTIVO'})}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center space-y-2 ${
                  formData.type === 'ACTIVO' 
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm ring-1 ring-emerald-500' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className={`p-2 rounded-full ${formData.type === 'ACTIVO' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
                  <TrendingUp size={24} />
                </div>
                <span className="font-bold text-sm">Activo</span>
                <span className="text-[10px] opacity-80">Ahorros, Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'PASIVO'})}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center space-y-2 ${
                  formData.type === 'PASIVO' 
                    ? 'border-rose-500 bg-rose-50/50 text-rose-700 shadow-sm ring-1 ring-rose-500' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-rose-200 hover:bg-white'
                }`}
              >
                <div className={`p-2 rounded-full ${formData.type === 'PASIVO' ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-400'}`}>
                  <TrendingDown size={24} />
                </div>
                <span className="font-bold text-sm">Pasivo</span>
                <span className="text-[10px] opacity-80">Deudas, Tarjetas</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: MONEDA */}
          <div className="space-y-3">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Moneda</label>
             <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, currency: 'HNL'})}
                className={`flex items-center justify-center space-x-3 p-3 rounded-xl border transition-all ${
                  formData.currency === 'HNL' 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins size={18} />
                <span className="font-medium">Lempiras (HNL)</span>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({...formData, currency: 'USD'})}
                className={`flex items-center justify-center space-x-3 p-3 rounded-xl border transition-all ${
                  formData.currency === 'USD' 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign size={18} />
                <span className="font-medium">Dólares (USD)</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 3: DETALLES */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nombre de la Cuenta</label>
              <div className="relative">
                <LayoutTemplate className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  placeholder="Ej: Nómina Principal"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Banco</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Ej: BAC"
                    value={formData.bankName}
                    onChange={e => setFormData({...formData, bankName: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Número (Opcional)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="**** 1234"
                    value={formData.accountNumber}
                    onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-slate-700">Saldo Inicial</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <span className={`font-bold text-lg ${formData.currency === 'HNL' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                    {formData.currency === 'HNL' ? 'L' : '$'}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-4 text-xl font-bold text-slate-800 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 font-mono"
                  placeholder="0.00"
                  value={formData.initialBalance || ''}
                  onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value) || 0})}
                />
              </div>
              <p className="text-xs text-slate-400 text-right">Saldo actual en la cuenta</p>
            </div>
          </div>

          <div className="pt-6 flex gap-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} className="mr-2" />
                  Guardar Cuenta
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
