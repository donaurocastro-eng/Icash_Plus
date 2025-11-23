
import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Building, Coins, DollarSign } from 'lucide-react';
import { Property, PropertyFormData } from '../types';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  editingProperty?: Property | null;
  isSubmitting: boolean;
}

const PropertyModal: React.FC<PropertyModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingProperty, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<PropertyFormData>({
    code: '',
    name: '',
    cadastralKey: '',
    annualTax: 0,
    value: 0,
    currency: 'HNL'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingProperty) {
      setFormData({
        code: editingProperty.code,
        name: editingProperty.name,
        cadastralKey: editingProperty.cadastralKey || '',
        annualTax: editingProperty.annualTax,
        value: editingProperty.value,
        currency: editingProperty.currency
      });
    } else {
      setFormData({ 
        code: '', 
        name: '', 
        cadastralKey: '', 
        annualTax: 0, 
        value: 0, 
        currency: 'HNL' 
      });
    }
    setError(null);
  }, [editingProperty, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("El Nombre de la Propiedad es obligatorio.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar la propiedad.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {editingProperty ? 'Editar Propiedad' : 'Añadir Nueva Propiedad'}
            </h3>
            {!editingProperty && (
               <p className="text-xs text-slate-500 mt-1">Registra tus inmuebles para alquiler</p>
            )}
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

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre Propiedad</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="p. ej., Apartamento 101"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Código de Propiedad</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="p. ej., AP-101"
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
              disabled={!!editingProperty} // Lock code on edit
            />
            <p className="text-xs text-slate-400">Opcional. Si lo dejas en blanco, se generará uno automáticamente.</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Clave Catastral (Opcional)</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="p. ej., 0801-1999-12345"
              value={formData.cadastralKey}
              onChange={e => setFormData({...formData, cadastralKey: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Impuesto Anual (Opcional)</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow font-mono"
              placeholder="0.00"
              value={formData.annualTax}
              onChange={e => setFormData({...formData, annualTax: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Valor de la Propiedad</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow font-mono"
                placeholder="0.00"
                value={formData.value}
                onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Moneda del Valor</label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow bg-white"
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value as any})}
              >
                <option value="HNL">HNL</option>
                <option value="USD">USD</option>
              </select>
            </div>
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
                  Crear Propiedad
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyModal;
