
import React from 'react';
import { X, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Transaction } from '../types';

interface ReportDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
}

const ReportDrilldownModal: React.FC<ReportDrilldownModalProps> = ({
  isOpen,
  onClose,
  title,
  transactions
}) => {
  if (!isOpen) return null;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (isoString: string) => {
     const [y, m, d] = isoString.split('-');
     return `${d}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Detalle de Movimientos</h3>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-medium text-slate-500 sticky top-0">
                    <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Descripción / Contrato</th>
                        <th className="px-6 py-3">Inquilino</th>
                        <th className="px-6 py-3">Categoría</th>
                        <th className="px-6 py-3 text-right">Monto</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                        <tr key={tx.code} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-mono text-slate-500">{formatDate(tx.date)}</td>
                            <td className="px-6 py-3">
                                <div className="font-medium text-slate-700">{tx.description}</div>
                                {tx.contractCode && (
                                    <div className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded w-fit mt-0.5">
                                        {tx.contractCode}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-3">
                                {tx.tenantName ? (
                                    <div>
                                        <div className="text-xs font-bold text-slate-700">{tx.tenantName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{tx.tenantCode}</div>
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                )}
                            </td>
                            <td className="px-6 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                    {tx.categoryName}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <div className={`flex items-center justify-end font-bold ${tx.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {tx.type === 'INGRESO' ? <ArrowUpCircle size={14} className="mr-1"/> : <ArrowDownCircle size={14} className="mr-1"/>}
                                    {formatMoney(tx.amount)}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay transacciones</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ReportDrilldownModal;
