import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, TrendingUp, Calendar } from 'lucide-react';
import { Contract, ContractPrice } from '../types';
import { ContractService } from '../services/contractService';

interface ContractPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  contractLabel: string;
}

const ContractPriceHistoryModal: React.FC<ContractPriceHistoryModalProps> = ({
  isOpen,
  onClose,
  contract,
  contractLabel
}) => {
  const [history, setHistory] = useState<ContractPrice[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && contract) {
      loadHistory();
      setNewAmount(contract.amount);
      setNewStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, contract]);

  const loadHistory = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const data = await ContractService.getPriceHistory(contract.code);
      setHistory(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contract || !newAmount || !newStartDate) return;
      setIsSubmitting(true);
      try {
          await ContractService.addPriceHistory(contract.code, newAmount, newStartDate);
          await loadHistory();
          setNewStartDate('');
      } catch (e) { alert("Error al guardar"); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("¿Eliminar este registro?")) return;
      try {
          await ContractService.deletePriceHistory(id);
          await loadHistory();
      } catch (e) { alert("Error al eliminar"); }
  };

  if (!isOpen || !contract) return null;

  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600"/> Historial de Precios</h3>
                <p className="text-xs text-slate-500">{contractLabel}</p>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-800 mb-3">Nuevo Precio</h4>
                <form onSubmit={handleAddPrice} className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-blue-700 mb-1">Monto</label>
                        <input type="number" step="0.01" required className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none" value={newAmount} onChange={e => setNewAmount(parseFloat(e.target.value))} />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-blue-700 mb-1">Inicio</label>
                        <input type="date" required className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"><Plus size={16}/> Guardar</button>
                </form>
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Línea de Tiempo</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="p-3 pl-4">Inicio</th><th className="p-3">Fin</th><th className="p-3 text-right">Monto</th><th className="p-3 text-center">Estado</th><th className="p-3 text-right"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map((item) => {
                                const today = new Date().toISOString().split('T')[0];
                                const isFuture = item.startDate > today;
                                const isPast = item.endDate && item.endDate < today;
                                const isCurrent = !isFuture && !isPast;
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-3 pl-4 font-mono text-slate-600">{item.startDate}</td>
                                        <td className="p-3 font-mono text-slate-400">{item.endDate || '-'}</td>
                                        <td className="p-3 text-right font-bold text-slate-700">{formatMoney(item.amount)}</td>
                                        <td className="p-3 text-center">
                                            {isCurrent && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">VIGENTE</span>}
                                            {isFuture && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">FUTURO</span>}
                                            {isPast && <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">HISTÓRICO</span>}
                                        </td>
                                        <td className="p-3 text-right"><button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPriceHistoryModal;