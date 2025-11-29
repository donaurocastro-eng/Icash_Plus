
import React, { useState } from 'react';
import { X, Calendar, Percent } from 'lucide-react';
import { LoanFormData } from '../types';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LoanFormData) => Promise<void>;
  isSubmitting: boolean;
}

const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<LoanFormData>({
    lenderName: '',
    loanNumber: '',
    initialAmount: 0,
    currency: 'HNL',
    loanDate: new Date().toISOString().split('T')[0],
    interestRate: 0,
    term: 12,
    monthlyInsurance: 0,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lenderName || !formData.initialAmount) {
      setError("Acreedor y Monto son obligatorios.");
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const currencySymbol = formData.currency === 'HNL' ? 'L' : '$';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Nuevo Préstamo</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Acreedor / Banco</label>
              <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Banco Atlántida"
                value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">No. Préstamo</label>
              <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Opcional"
                value={formData.loanNumber} onChange={e => setFormData({...formData, loanNumber: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Monto Inicial</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currencySymbol}</span>
                <input type="number" step="0.01" className="w-full pl-8 pr-3 py-2 border rounded-lg font-mono font-bold text-slate-700"
                  value={formData.initialAmount} onChange={e => setFormData({...formData, initialAmount: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Moneda</label>
              <select className="w-full px-3 py-2 border rounded-lg bg-white"
                value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as any})}>
                <option value="HNL">Lempiras (HNL)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de Inicio</label>
            <input type="date" className="w-full px-3 py-2 border rounded-lg"
              value={formData.loanDate} onChange={e => setFormData({...formData, loanDate: e.target.value})} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2"><Percent size={16}/> Condiciones (Para Amortización)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Tasa Anual (%)</label>
                <input type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg"
                  value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Plazo (Meses)</label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg"
                  value={formData.term} onChange={e => setFormData({...formData, term: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Seguro Mensual</label>
                <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currencySymbol}</span>
                    <input type="number" step="0.01" className="w-full pl-6 pr-2 py-2 border rounded-lg"
                    value={formData.monthlyInsurance} onChange={e => setFormData({...formData, monthlyInsurance: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
             <label className="block text-xs font-bold text-slate-500 mb-1">Notas</label>
             <textarea className="w-full px-3 py-2 border rounded-lg h-20 text-sm" 
               value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Crear Préstamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanModal;
