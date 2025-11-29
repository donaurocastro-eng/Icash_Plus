
import React from 'react';
import { X, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Loan, Payment } from '../types';

interface AmortizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onPay: (payment: Payment) => void;
}

const AmortizationModal: React.FC<AmortizationModalProps> = ({ isOpen, onClose, loan, onPay }) => {
  if (!isOpen || !loan) return null;

  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Tabla de Amortización</h3>
            <p className="text-xs text-slate-500">{loan.lenderName} - {formatMoney(loan.initialAmount)} {loan.currency}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-auto">
            {(!loan.paymentPlan || loan.paymentPlan.length === 0) ? (
                <div className="p-12 text-center text-slate-400">No hay plan de pagos generado.</div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="p-3 text-center">#</th>
                            <th className="p-3">Vencimiento</th>
                            <th className="p-3 text-right">Cuota Total</th>
                            <th className="p-3 text-right">Principal</th>
                            <th className="p-3 text-right">Interés</th>
                            <th className="p-3 text-right">Seguro</th>
                            <th className="p-3 text-right">Saldo</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loan.paymentPlan.map((p, idx) => (
                            <tr key={idx} className={`hover:bg-slate-50 ${p.status === 'PAID' ? 'bg-emerald-50/30' : ''}`}>
                                <td className="p-3 text-center font-mono text-slate-400">{p.paymentNumber}</td>
                                <td className="p-3 text-slate-700">{new Date(p.dueDate).toLocaleDateString()}</td>
                                <td className="p-3 text-right font-bold text-slate-700">{formatMoney(p.totalPayment)}</td>
                                <td className="p-3 text-right text-emerald-600">{formatMoney(p.principal)}</td>
                                <td className="p-3 text-right text-rose-600">{formatMoney(p.interest)}</td>
                                <td className="p-3 text-right text-slate-500">{formatMoney(p.insurance)}</td>
                                <td className="p-3 text-right font-mono text-slate-600">{formatMoney(p.remainingBalance)}</td>
                                <td className="p-3 text-center">
                                    {p.status === 'PAID' ? (
                                        <div className="flex flex-col items-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                                <CheckCircle size={10}/> PAGADO
                                            </span>
                                            {p.paidDate && <span className="text-[10px] text-slate-400 mt-0.5">{new Date(p.paidDate).toLocaleDateString()}</span>}
                                        </div>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                            <Clock size={10}/> PENDIENTE
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-center">
                                    {p.status !== 'PAID' && (
                                        <button 
                                            onClick={() => onPay(p)}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1 mx-auto"
                                        >
                                            <DollarSign size={12}/> Pagar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};

export default AmortizationModal;
