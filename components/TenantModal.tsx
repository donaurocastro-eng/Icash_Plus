
import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, User, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Tenant, TenantFormData } from '../types';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TenantFormData) => Promise<void>;
  editingTenant?: Tenant | null;
  isSubmitting: boolean;
}

const TenantModal: React.FC<TenantModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingTenant, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<TenantFormData>({
    fullName: '',
    phone: '',
    email: '',
    status: 'ACTIVE'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTenant) {
      setFormData({
        fullName: editingTenant.fullName,
        phone: editingTenant.phone || '',
        email: editingTenant.email || '',
        status: editingTenant.status || 'ACTIVE'
      });
    } else {
      setFormData({ fullName: '', phone: '', email: '', status: 'ACTIVE' });
    }
    setError(null);
  }, [editingTenant, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar el inquilino.");
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
              {editingTenant ? 'Editar Inquilino' : 'Nuevo Inquilino'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">El código se genera automáticamente (INQ-XXX)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                placeholder="Juan Pérez"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                autoFocus
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Teléfono (Opcional)</label>
            <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                placeholder="+504 9999-9999"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Email (Opcional)</label>
             <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="email"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                placeholder="juan@ejemplo.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
          </div>

          {/* Status Selector */}
          <div className="space-y-1 pt-1">
            <label className="block text-sm font-medium text-slate-700">Estado del Inquilino</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setFormData({...formData, status: 'ACTIVE'})}
                    className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border transition-all ${
                        formData.status === 'ACTIVE' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">Activo</span>
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({...formData, status: 'INACTIVE'})}
                    className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border transition-all ${
                        formData.status === 'INACTIVE' 
                        ? 'bg-slate-100 border-slate-400 text-slate-600 shadow-sm ring-1 ring-slate-400' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <XCircle size={18} />
                    <span className="text-sm font-bold">Inactivo</span>
                </button>
            </div>
          </div>

          <div className="pt-4 flex space-x-3 border-t border-slate-100">
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

export default TenantModal;
