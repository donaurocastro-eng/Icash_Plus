import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Home } from 'lucide-react';
import { Apartment, ApartmentFormData, Property } from '../types';
import { PropertyService } from '../services/propertyService';

interface ApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApartmentFormData) => Promise<void>;
  editingApartment?: Apartment | null;
  isSubmitting: boolean;
}

const ApartmentModal: React.FC<ApartmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingApartment, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<ApartmentFormData>({
    propertyCode: '',
    name: '',
    status: 'AVAILABLE'
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProperties();
      if (editingApartment) {
        setFormData({
          propertyCode: editingApartment.propertyCode,
          name: editingApartment.name,
          status: editingApartment.status
        });
      } else {
        setFormData({ propertyCode: '', name: '', status: 'AVAILABLE' });
      }
      setError(null);
    }
  }, [editingApartment, isOpen]);

  const loadProperties = async () => {
    try {
      const data = await PropertyService.getAll();
      setProperties(data);
    } catch (err) { console.error(err); }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyCode || !formData.name.trim()) {
      setError("Debes seleccionar una Propiedad (Edificio) y asignar un Nombre a la Unidad.");
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
            <h3 className="text-lg font-bold text-slate-800">{editingApartment ? 'Editar Unidad' : 'Nueva Unidad'}</h3>
            <p className="text-xs text-slate-500 mt-1">Apartamento, Local o Casa Individual</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center"><AlertCircle size={16} className="mr-2 shrink-0" />{error}</div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Propiedad Principal (Edificio)</label>
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              value={formData.propertyCode}
              onChange={e => setFormData({...formData, propertyCode: e.target.value})}
            >
              <option value="">Seleccionar Edificio...</option>
              {properties.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre / Número de Unidad</label>
            <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Ej: Apto 101, Local B"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Estado</label>
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
            >
              <option value="AVAILABLE">Disponible</option>
              <option value="RENTED">Alquilado</option>
              <option value="MAINTENANCE">En Mantenimiento</option>
            </select>
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

export default ApartmentModal;