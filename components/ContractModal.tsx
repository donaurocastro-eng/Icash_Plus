import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, FileText, Calendar, DollarSign, User, Home, FastForward } from 'lucide-react';
import { Contract, ContractFormData, Apartment, Tenant } from '../types';
import { ApartmentService } from '../services/apartmentService';
import { TenantService } from '../services/tenantService';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => Promise<void>;
  editingContract?: Contract | null;
  isSubmitting: boolean;
}

const ContractModal: React.FC<ContractModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingContract, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<ContractFormData>({
    apartmentCode: '',
    tenantCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    amount: 0,
    paymentDay: 1,
    nextPaymentDate: new Date().toISOString().split('T')[0]
  });
  
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (editingContract) {
        setFormData({
          apartmentCode: editingContract.apartmentCode,
          tenantCode: editingContract.tenantCode,
          startDate: editingContract.startDate,
          endDate: editingContract.endDate,
          amount: editingContract.amount,
          paymentDay: editingContract.paymentDay,
          nextPaymentDate: editingContract.nextPaymentDate
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          apartmentCode: '',
          tenantCode: '',
          startDate: today,
          endDate: '',
          amount: 0,
          paymentDay: 1,
          nextPaymentDate: today
        });
      }
      setError(null);
    }
  }, [editingContract, isOpen]);

  const loadDependencies = async () => {
    try {
      const [apts, tens] = await Promise.all([
        ApartmentService.getAll(),
        TenantService.getAll()
      ]);
      setApartments(apts);
      setTenants(tens.filter(t => t.status === 'ACTIVE'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apartmentCode || !formData.tenantCode || !formData.amount) {
      setError("Unidad, Inquilino y Monto son obligatorios.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar contrato.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {editingContract ? 'Editar Contrato' : 'Nuevo Contrato'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Asigna un inquilino a una unidad</p>
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
                <label className="block text-sm font-medium text-slate-700">Unidad / Apartamento</label>
                <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                        value={formData.apartmentCode}
                        onChange={e => setFormData({...formData, apartmentCode: e.target.value})}
                    >
                        <option value="">Seleccionar...</option>
                        {apartments.map(a => (
                            <option key={a.code} value={a.code}>
                                {a.name} ({a.status === 'RENTED' && a.code !== editingContract?.apartmentCode ? 'Ocupado' : 'Disp.'})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Inquilino</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
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
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha Inicio</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.startDate}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha Fin (Opcional)</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.endDate}
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                    />
                </div>
            </div>
          </div>

          {/* Advanced Setting: Next Payment Date */}
          <div className="space-y-1 bg-amber-50 p-3 rounded-lg border border-amber-100">
                <label className="block text-sm font-bold text-amber-800 mb-1 flex items-center gap-2">
                    <FastForward size={16}/> Próximo Pago (Ajuste Manual)
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                    <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm"
                        value={formData.nextPaymentDate || ''}
                        onChange={e => setFormData({...formData, nextPaymentDate: e.target.value})}
                    />
                </div>
                <p className="text-[10px] text-amber-700 mt-1">
                    Cambia esto solo si necesitas corregir manualmente el calendario de pagos (ej. si el sistema se adelantó o atrasó).
                </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Monto Mensual</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="number"
                        step="0.01"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Día de Pago (1-31)</label>
                <input
                    type="number"
                    min="1" max="31"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                    value={formData.paymentDay}
                    onChange={e => setFormData({...formData, paymentDay: parseInt(e.target.value) || 1})}
                />
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

export default ContractModal;