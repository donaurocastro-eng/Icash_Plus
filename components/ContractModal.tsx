import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, FileText } from 'lucide-react';
import { ContractFormData, Property, Tenant, Apartment, Contract } from '../types';
import { PropertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { ApartmentService } from '../services/apartmentService';

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
    startDate: '',
    endDate: '',
    amount: 0,
    paymentDay: 1
  });
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const [selectedPropCode, setSelectedPropCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData().then(() => {
          if (editingContract) {
            setFormData({
              apartmentCode: editingContract.apartmentCode,
              tenantCode: editingContract.tenantCode,
              startDate: editingContract.startDate,
              endDate: editingContract.endDate,
              amount: editingContract.amount,
              paymentDay: editingContract.paymentDay
            });
            setSelectedPropCode(''); 
          } else {
            setFormData({
              apartmentCode: '',
              tenantCode: '',
              startDate: '',
              endDate: '',
              amount: 0,
              paymentDay: 1
            });
            setSelectedPropCode('');
          }
      });
      setError(null);
    }
  }, [isOpen, editingContract]);

  const loadData = async () => {
    try {
      const [p, t, a] = await Promise.all([
        PropertyService.getAll(),
        TenantService.getAll(),
        ApartmentService.getAll()
      ]);
      setProperties(p);
      setTenants(t);
      setApartments(a);
    } catch (err) { console.error(err); }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apartmentCode || !formData.tenantCode || !formData.startDate || !formData.endDate || !formData.amount) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar el contrato.");
    }
  };

  const filteredApartments = apartments.filter(a => 
    selectedPropCode ? a.propertyCode === selectedPropCode : true
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{editingContract ? 'Editar Contrato' : 'Nuevo Contrato'}</h3>
            <p className="text-xs text-slate-500 mt-1">{editingContract ? `Código: ${editingContract.code}` : 'Vincula una unidad con un inquilino'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center"><AlertCircle size={16} className="mr-2 shrink-0" />{error}</div>
          )}
          
          {editingContract && (
             <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100 mb-2">
                ℹ️ Si cambias el monto, se registrará un cambio de precio histórico a partir de hoy. Los pagos de meses anteriores mantendrán el precio viejo.
             </div>
          )}

          <div className="space-y-1">
             <label className="block text-xs font-bold text-slate-400 uppercase">1. Filtrar por Edificio</label>
             <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50"
                value={selectedPropCode}
                onChange={e => {
                    setSelectedPropCode(e.target.value);
                    setFormData({...formData, apartmentCode: ''});
                }}
             >
                <option value="">Todos los Edificios</option>
                {properties.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
             </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">2. Unidad / Apto</label>
                <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={formData.apartmentCode}
                    onChange={e => setFormData({...formData, apartmentCode: e.target.value})}
                >
                    <option value="">Seleccionar...</option>
                    {filteredApartments.map(a => (
                        <option key={a.code} value={a.code}>
                            {a.name} {a.status !== 'AVAILABLE' && a.code !== editingContract?.apartmentCode ? '(Ocupado)' : ''}
                        </option>
                    ))}
                </select>
            </div>
             <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">3. Inquilino</label>
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
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha Fin</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Monto Alquiler</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                placeholder="0.00" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Día de Pago</label>
              <input type="number" min="1" max="31" className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                value={formData.paymentDay} onChange={e => setFormData({...formData, paymentDay: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg">
                {editingContract ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractModal;