import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Zap, Home, Tag, CreditCard } from 'lucide-react';
import { PropertyServiceItem, PropertyServiceItemFormData, Property, Category, Account } from '../types';
import { PropertyService } from '../services/propertyService';
import { CategoryService } from '../services/categoryService';
import { AccountService } from '../services/accountService';

interface ServiceItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyServiceItemFormData) => Promise<void>;
  editingItem?: PropertyServiceItem | null;
  isSubmitting: boolean;
}

const ServiceItemModal: React.FC<ServiceItemModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingItem, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<PropertyServiceItemFormData>({
    propertyCode: '',
    name: '',
    defaultAmount: 0,
    defaultCategoryCode: '',
    defaultAccountCode: '',
    active: true
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (editingItem) {
        setFormData({
          propertyCode: editingItem.propertyCode,
          name: editingItem.name,
          defaultAmount: editingItem.defaultAmount,
          defaultCategoryCode: editingItem.defaultCategoryCode || '',
          defaultAccountCode: editingItem.defaultAccountCode || '',
          active: editingItem.active
        });
      } else {
        setFormData({ propertyCode: '', name: '', defaultAmount: 0, defaultCategoryCode: '', defaultAccountCode: '', active: true });
      }
      setError(null);
    }
  }, [editingItem, isOpen]);

  const loadDependencies = async () => {
    try {
      const [props, cats, accs] = await Promise.all([
          PropertyService.getAll(),
          CategoryService.getAll(),
          AccountService.getAll()
      ]);
      setProperties(props);
      setCategories(cats.filter(c => c.type === 'GASTO'));
      setAccounts(accs);
    } catch (err) { console.error(err); }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyCode || !formData.name.trim()) {
      setError("Debes seleccionar una Propiedad y dar un nombre al servicio.");
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{editingItem ? 'Editar Servicio' : 'Nuevo Servicio Recurrente'}</h3>
            <p className="text-xs text-slate-500 mt-1">Agua, Luz, Seguridad, etc.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center"><AlertCircle size={16} className="mr-2 shrink-0" />{error}</div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Propiedad (Edificio/Casa)</label>
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              value={formData.propertyCode}
              onChange={e => setFormData({...formData, propertyCode: e.target.value})}
            >
              <option value="">Seleccionar Propiedad...</option>
              {properties.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre del Servicio</label>
            <div className="relative">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Ej: Agua Potable"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Categoría de Gasto Asociada</label>
            <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                value={formData.defaultCategoryCode}
                onChange={e => setFormData({...formData, defaultCategoryCode: e.target.value})}
                >
                <option value="">Sin categoría asignada...</option>
                {categories.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                ))}
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Cuenta de Pago Habitual</label>
            <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                value={formData.defaultAccountCode}
                onChange={e => setFormData({...formData, defaultAccountCode: e.target.value})}
                >
                <option value="">Sin cuenta asignada...</option>
                {accounts.map(a => (
                    <option key={a.code} value={a.code}>{a.name} ({a.currency})</option>
                ))}
                </select>
            </div>
            <p className="text-xs text-slate-400">Se pre-seleccionará al momento de pagar.</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Costo Estimado Mensual</label>
            <input
              type="number" step="0.01"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono"
              value={formData.defaultAmount}
              onChange={e => setFormData({...formData, defaultAmount: parseFloat(e.target.value)})}
            />
          </div>

           <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="active"
                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                checked={formData.active}
                onChange={e => setFormData({...formData, active: e.target.checked})}
              />
              <label htmlFor="active" className="text-sm text-slate-700 select-none">Servicio Activo</label>
           </div>

          <div className="pt-4 flex space-x-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-md disabled:opacity-50">
              {isSubmitting ? <span className="animate-spin">...</span> : <><Save size={18} className="mr-2" /> Guardar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceItemModal;