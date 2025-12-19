
import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Category, CategoryFormData, CategoryType } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  editingCategory?: Category | null;
  isSubmitting: boolean;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingCategory, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'GASTO'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        type: editingCategory.type
      });
    } else {
      setFormData({ name: '', type: 'GASTO' });
    }
    setError(null);
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar la categoría.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {editingCategory ? `Código: ${editingCategory.code}` : 'El código se generará automáticamente'}
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

          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${formData.type === 'GASTO' ? 'bg-rose-50 border-rose-500 text-rose-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'GASTO'})}
            >
              Gasto (EXP)
            </div>
            <div 
              className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${formData.type === 'INGRESO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'INGRESO'})}
            >
              Ingreso (INC)
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre de la Categoría</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              placeholder="Ej: Alimentación, Salario, Transporte"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              autoFocus
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
              className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

export default CategoryModal;
