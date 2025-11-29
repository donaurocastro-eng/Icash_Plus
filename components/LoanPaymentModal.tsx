
import React, { useState, useEffect } from 'react';
import { X, CreditCard, Activity, Calendar, Clock } from 'lucide-react';
import { Loan, Account, Payment } from '../types';
import { AccountService } from '../services/accountService';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { loan: Loan, amount: number, extraPrincipal: number, fromAccountId: string, date: string, paymentNumber?: number }) => Promise<void>;
  loan: Loan | null;
  nextPayment?: Payment;
  isSubmitting: boolean;
}

const LoanPaymentModal: React.FC<LoanPaymentModalProps> = ({ isOpen, onClose, onSubmit, loan, nextPayment, isSubmitting }) => {
  const [amount, setAmount] = useState(0);
  const [extraPrincipal, setExtraPrincipal] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && loan) {
      loadAccounts();
      if (nextPayment) {
          setAmount(nextPayment.totalPayment);
      } else {
          setAmount(0);
      }
      setExtraPrincipal(0);
      setAccountId('');
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, loan, nextPayment]);

  const loadAccounts = async () => {
      try {
          const all = await AccountService.getAll();
          setAccounts(all.filter(a => a.currency === loan?.currency && a.type === 'ACTIVO'));
      } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loan || !amount || !accountId) {
          setError("Monto y Cuenta son obligatorios.");
          return;
      }
      try {
          await onSubmit({
              loan,
              amount,
              extraPrincipal,
              fromAccountId: accountId,
              date,
              paymentNumber: nextPayment?.paymentNumber
          });
      } catch (e: any) {
          setError(e.message);
      }
  };

  if (!isOpen || !loan) return null;

  const currencySymbol = loan.currency === 'HNL' ? 'L' : '$';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <div>
            <h3 className="text-lg font-bold text-indigo-900">Registrar Pago</h3>
            <p className="text-xs text-indigo-600">Préstamo: {loan.lenderName}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

          {nextPayment && (
              <div className="bg-slate-50 p-4 rounded-lg text-sm border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">Cuota #{nextPayment.paymentNumber}</span>
                      <span className="text-xs text-slate-500 font-mono">Saldo: {currencySymbol} {nextPayment.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex items-center text-slate-600 gap-2">
                      <Clock size={16} className="text-amber-500"/>
                      <span>Vencimiento: <strong>{new Date(nextPayment.dueDate).toLocaleDateString()}</strong></span>
                  </div>
              </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Monto Cuota</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                <input type="number" step="0.01" className="w-full pl-9 pr-3 py-2 border rounded-lg font-bold text-slate-700" 
                    value={amount} onChange={e => setAmount(parseFloat(e.target.value))}/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Abono Extra a Capital (Opcional)</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                <input type="number" step="0.01" className="w-full pl-9 pr-3 py-2 border rounded-lg text-emerald-600 font-medium" 
                    value={extraPrincipal} onChange={e => setExtraPrincipal(parseFloat(e.target.value))}/>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Esto reducirá el plazo del préstamo.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Cuenta de Origen</label>
            <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <select className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white" 
                    value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {accounts.map(a => <option key={a.code} value={a.code}>{a.name} ({a.currency}) - {a.initialBalance}</option>)}
                </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Real de Pago</label>
            <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input type="date" className="w-full pl-9 pr-3 py-2 border rounded-lg" 
                    value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            {isSubmitting && (
               <div className="flex items-center justify-center space-x-2 text-emerald-600 text-sm font-medium animate-pulse">
                  <Activity size={16} />
                  <span>Procesando pago...</span>
               </div>
            )}
            <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 font-medium">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md disabled:opacity-50">
                {isSubmitting ? 'Pagando...' : 'Confirmar Pago'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanPaymentModal;
