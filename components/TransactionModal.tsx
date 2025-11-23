import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Calendar, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { TransactionFormData, Category, Account, CategoryType } from '../types';
import { CategoryService } from '../services/categoryService';
import { AccountService } from '../services/accountService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  isSubmitting: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    description: '',
    amount: 0,
    type: 'GASTO',
    categoryCode: '',
    accountCode: '',
    propertyCode: '',
    propertyName: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: 'GASTO',
        categoryCode: '',
        accountCode: '',
        propertyCode: '',
        propertyName: ''
      });
      setError(null);
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      const [cats, accs] = await Promise.all([
        CategoryService.getAll(),
        AccountService.getAll()
      ]);
      setCategories(cats);
      setAccounts(accs);
    } catch (err) {
      console.error("Error loading dependencies", err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount || !formData.categoryCode || !formData.accountCode) {
      setError("Por favor completa los campos obligatorios: Descripción, Monto, Categoría y Cuenta.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar la transacción.");
    }
  };

  // Filter categories based on selected Type
  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Nueva Transacción</h3>
            <p className="text-xs text-slate-500 mt-1">
              Registra un Ingreso o un Gasto (Código TR-XXXXX automático)
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center transition-all ${formData.type === 'GASTO' ? 'bg-rose-50 border-rose-500 text-rose-700 font-medium ring-1 ring-rose-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'GASTO', categoryCode: ''})}
            >
              <ArrowDownCircle size={24} className="mb-2" />
              <span>GASTO</span>
            </div>
            <div 
              className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center transition-all ${formData.type === 'INGRESO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium ring-1 ring-emerald-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'INGRESO', categoryCode: ''})}
            >
              <ArrowUpCircle size={24} className="mb-2" />
              <span>INGRESO</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono text-lg"
                  placeholder="0.00"
                  value={formData.amount || ''}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none h-24"
                  placeholder="Detalle de la transacción..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Cuenta Bancaria / Efectivo</label>
                <select
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                  value={formData.accountCode}
                  onChange={e => setFormData({...formData, accountCode: e.target.value})}
                >
                  <option value="">Seleccione una cuenta</option>
                  {accounts.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.name} ({acc.currency}) - Saldo: {acc.initialBalance}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Categoría ({formData.type})</label>
                <select
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                  value={formData.categoryCode}
                  onChange={e => setFormData({...formData, categoryCode: e.target.value})}
                >
                  <option value="">Seleccione una categoría</option>
                  {filteredCategories.length === 0 && <option disabled>No hay categorías de {formData.type.toLowerCase()}</option>}
                  {filteredCategories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Section (Optional) */}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Propiedad (Opcional)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="Cod. Propiedad"
                    value={formData.propertyCode}
                    onChange={e => setFormData({...formData, propertyCode: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="Nombre Propiedad"
                    value={formData.propertyName}
                    onChange={e => setFormData({...formData, propertyName: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Guardar Transacción
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;