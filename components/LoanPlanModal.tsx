
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Calendar, Percent, Activity, AlertTriangle } from 'lucide-react';
import { Loan } from '../types';

interface LoanPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { interestRate: number, term: number, monthlyInsurance: number, startDate: string, amount: number }) => Promise<void>;
  loan: Loan | null;
  isSubmitting: boolean;
}

const LoanPlanModal: React.FC<LoanPlanModalProps> = ({ isOpen, onClose, onSubmit, loan, isSubmitting }) => {
  const [formData, setFormData] = useState({
    amount: 0,
    interestRate: 0,
    term: 12,
    monthlyInsurance: 0,
    startDate: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState<string | null>(null);
  const [isRefinance, setIsRefinance] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      // Check for paid installments to determine Refinance mode
      const paidInstallments = loan.paymentPlan?.filter(p => p.status === 'PAID') || [];
      const hasHistory = paidInstallments.length > 0;
      setIsRefinance(hasHistory);

      let amountToFinance = loan.initialAmount;
      let startFromDate = loan.loanDate;

      if (hasHistory) {
          // Sort to find last payment
          paidInstallments.sort((a, b) => a.paymentNumber - b.paymentNumber);
          const lastPayment = paidInstallments[paidInstallments.length - 1];
          amountToFinance = lastPayment.remainingBalance;
          startFromDate = new Date().toISOString().split('T')[0]; // Default new term to today
      }

      setFormData({
        amount: amountToFinance, 
        interestRate: loan.interestRate || 0,
        term: loan.term || 12,
        monthlyInsurance: loan.monthlyInsurance || 0,
        startDate: startFromDate
      });
      setError(null);
    }
  }, [isOpen, loan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.term) {
      setError("Monto y Plazo son obligatorios para calcular.");
      return;
    }
    
    try {
        await onSubmit(formData);
        onClose();
    } catch (err: any) {
        setError(err.message);
    }
  };

  if (!isOpen || !loan) return null;

  const currencySymbol = loan.currency === 'HNL' ? 'L' : '$';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <RefreshCw size={18}/> {isRefinance ? 'Refinanciar / Ajustar' : 'Generar Plan'}
            </h3>
            <p className="text-xs text-indigo-600">{loan.lenderName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
          
          {isRefinance ? (
              <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800 mb-2 border border-amber-100 flex gap-2">
                 <AlertTriangle size={16} className="shrink-0"/>
                 <div>
                     <p className="font-bold mb-1">Modo Refinanciamiento:</p>
                     Este préstamo tiene pagos registrados. Se generará un nuevo plan solo para el <strong>saldo pendiente</strong>, manteniendo el historial intacto.
                 </div>
              </div>
          ) : (
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mb-2 border border-slate-200">
                 Se generará una tabla de amortización nueva desde cero.
              </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
                {isRefinance ? 'Saldo a Financiar' : 'Monto Original'}
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                <input type="number" step="0.01" className="w-full pl-9 pr-3 py-2 border rounded-lg font-bold text-slate-700" 
                    value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tasa Anual (%)</label>
                <div className="relative">
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="number" step="0.01" className="w-full pl-8 pr-3 py-2 border rounded-lg" 
                        value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})}/>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                    {isRefinance ? 'Plazo Restante (Meses)' : 'Plazo Total (Meses)'}
                </label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg" 
                    value={formData.term} onChange={e => setFormData({...formData, term: parseFloat(e.target.value)})}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Seguro Mensual</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currencySymbol}</span>
                    <input type="number" step="0.01" className="w-full pl-8 pr-3 py-2 border rounded-lg" 
                        value={formData.monthlyInsurance} onChange={e => setFormData({...formData, monthlyInsurance: parseFloat(e.target.value)})}/>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                    {isRefinance ? 'Fecha Siguiente Pago' : 'Fecha Inicio'}
                </label>
                <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="date" className="w-full pl-8 pr-3 py-2 border rounded-lg" 
                        value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}/>
                </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            {isSubmitting && (
               <div className="flex items-center justify-center space-x-2 text-indigo-600 text-sm font-medium animate-pulse">
                  <Activity size={16} />
                  <span>Calculando tabla...</span>
               </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 font-medium">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md disabled:opacity-50">
                {isSubmitting ? 'Generando...' : 'Generar Tabla'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanPlanModal;
