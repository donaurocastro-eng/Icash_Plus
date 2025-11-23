
import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, FileText, Calendar } from 'lucide-react';
import { ContractFormData, Property, Tenant } from '../types';
import { PropertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => Promise<void>;
  isSubmitting: boolean;
}

const ContractModal: React.FC<ContractModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<ContractFormData>({
    propertyCode: '',
    tenantCode: '',
    startDate: '',
    endDate: '',
    amount: 0,
    paymentDay: 1
  });
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setFormData({
        propertyCode: '',
        tenantCode: '',
        startDate: '',
        endDate: '',
        amount: 0,
        paymentDay: 1
      });
      setError(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [p, t] = await Promise.all([
        PropertyService.getAll(),
        TenantService.getAll()
      ]);
      setProperties(p);
      setTenants(t);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyCode || !formData.tenantCode || !formData.startDate || !formData.endDate || !formData.amount) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
        return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al crear el contrato.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Nuevo Contrato de Alquiler</h3>
            <p className="text-xs text-slate-500 mt-1">Vincula una propiedad con un inquilino</p>
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
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Propiedad</label>
                <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={formData.propertyCode}
                    onChange={e => setFormData({...formData, propertyCode: e.target.value})}
                >
                    <option value="">Seleccionar...</option>
                    {properties.map(p => (
                        <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                    ))}
                </select>
            </div>
             <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Inquilino</label>
                <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={formData.tenantCode}
                    onChange={e => setFormData({...formData, tenantCode: e.target.value})}
                >
                    <option value="">Seleccionar...</option>
                    {tenants.map(t => (
                        <option key={t.code} value={t.code}>{t.fullName}</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha Inicio</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    />
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha Fin</label>
                <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Monto Alquiler</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono"
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Día de Pago (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                value={formData.paymentDay}
                onChange={e => setFormData({...formData, paymentDay: parseInt(e.target.value)})}
              />
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
                  Crear Contrato
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractModal;
