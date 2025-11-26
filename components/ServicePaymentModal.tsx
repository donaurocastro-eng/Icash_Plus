import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, DollarSign, Calendar, CreditCard, Tag } from 'lucide-react';
import { PropertyServiceItem, ServicePaymentFormData, Account, Category } from '../types';
import { AccountService } from '../services/accountService';
import { CategoryService } from '../services/categoryService';

interface ServicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServicePaymentFormData) => Promise<void>;
  serviceItem: PropertyServiceItem | null;
  isSubmitting: boolean;
}

const ServicePaymentModal: React.FC<ServicePaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  serviceItem, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<ServicePaymentFormData>({
    serviceCode: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    accountCode: '',
    categoryCode: '',
    description: ''
  });
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serviceItem) {
      loadDependencies();
      setFormData({
        serviceCode: serviceItem.code,
        date: new Date().toISOString().split('T')[0],
        amount: serviceItem.defaultAmount,
        accountCode: '',
        categoryCode: serviceItem.defaultCategoryCode || '',
        description: `Pago Servicio: ${serviceItem.name}`
      });
      setError(null);
    }
  }, [isOpen, serviceItem]);

  const loadDependencies = async () => {
    try {
      const [accs, cats] = await Promise.all([
          AccountService.getAll(),
          CategoryService.getAll()
      ]);
      setAccounts(accs); // All accounts (Asset + Liability) allowed for expense
      setCategories(cats.filter(c => c.type === 'GASTO'));
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountCode || !formData.categoryCode) {
      setError("Monto, Cuenta y Categoría son obligatorios.");
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al registrar pago.");
    }
  };

  if (!isOpen || !serviceItem) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50">
          <div>
            <h3 className="text-lg font-bold text-rose-800">Pagar Servicio</h3>
            <p className="text-xs text-rose-600 mt-1">{serviceItem.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center"><AlertCircle size={16} className="mr-2 shrink-0" />{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Monto Real</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" step="0.01" className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800"
                        value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Cuenta de Origen (Pago)</label>
            <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 bg-white"
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
            <label className="block text-sm font-medium text-slate-700">Categoría de Gasto</label>
            <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    value={formData.categoryCode}
                    onChange={e => setFormData({...formData, categoryCode: e.target.value})}
                >
                    <option value="">Seleccionar Categoría...</option>
                    {categories.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Descripción</label>
            <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="pt-2 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-md disabled:opacity-50">
                {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServicePaymentModal;