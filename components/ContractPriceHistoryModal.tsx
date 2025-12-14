import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, TrendingUp, Calendar, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
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
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para mensajes de ayuda visual
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contract) {
      loadHistory();
      setNewAmount(contract.amount);
      setNewStartDate(new Date().toISOString().split('T')[0]);
      setNewEndDate('');
      setFeedback(null);
    }
  }, [isOpen, contract]);

  // Auto-ocultar mensajes de éxito
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

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
      setFeedback(null);
      
      try {
          await ContractService.addPriceHistory(contract.code, newAmount, newStartDate, newEndDate || undefined);
          await loadHistory();
          setFeedback({ type: 'success', message: 'Nuevo precio registrado correctamente.' });
          
          // Reset fields but keep reasonable defaults
          setNewStartDate(new Date().toISOString().split('T')[0]);
          setNewEndDate('');
      } catch (e: any) { 
          setFeedback({ type: 'error', message: "Error al guardar: " + e.message });
      } finally { 
          setIsSubmitting(false); 
      }
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm("¿Estás seguro de que deseas eliminar este registro histórico?")) return;
      
      setDeletingId(id);
      setFeedback(null);

      try {
          await ContractService.deletePriceHistory(id);
          await loadHistory();
          setFeedback({ type: 'success', message: 'Registro eliminado correctamente.' });
      } catch (e: any) { 
          setFeedback({ type: 'error', message: "Error al eliminar: " + e.message });
      } finally {
          setDeletingId(null);
      }
  };

  if (!isOpen || !contract) return null;

  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600"/> Historial de Precios</h3>
                <p className="text-xs text-slate-500">{contractLabel}</p>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Mensajes de Feedback (Ayuda Visual) */}
            {feedback && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-fadeIn ${
                    feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                    {feedback.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                    {feedback.message}
                </div>
            )}

            {/* Formulario */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                <h4 className="text-sm font-bold text-blue-800 mb-3">Nuevo Precio / Ajuste</h4>
                <form onSubmit={handleAddPrice} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Monto</label>
                            <input type="number" step="0.01" required className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                                value={newAmount} onChange={e => setNewAmount(parseFloat(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Fecha Inicio</label>
                            <input type="date" required className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                                value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Fecha Fin (Opcional)</label>
                            <input type="date" className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                                value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md transition-all">
                            {isSubmitting ? 'Guardando...' : <><Plus size={16}/> Guardar Precio</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Tabla Historial */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Calendar size={16}/> Línea de Tiempo
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="p-3 pl-4">Inicio</th>
                                <th className="p-3">Fin</th>
                                <th className="p-3 text-right">Monto</th>
                                <th className="p-3 text-center">Estado</th>
                                <th className="p-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map((item) => {
                                const today = new Date().toISOString().split('T')[0];
                                const effectiveEndDate = item.endDate || contract.endDate || '';
                                const isFuture = item.startDate > today;
                                const isPast = effectiveEndDate && effectiveEndDate < today;
                                const isCurrent = !isFuture && (!effectiveEndDate || effectiveEndDate >= today);
                                
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-emerald-50/30' : ''}`}>
                                        <td className="p-3 pl-4 font-mono text-slate-600">{item.startDate}</td>
                                        <td className="p-3 font-mono text-slate-400">
                                            {item.endDate ? item.endDate : <span className="text-xs italic text-slate-300">{contract.endDate ? `${contract.endDate} (Contrato)` : 'Indefinido'}</span>}
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-700">{formatMoney(item.amount)}</td>
                                        <td className="p-3 text-center">
                                            {isCurrent && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wide">VIGENTE</span>}
                                            {isFuture && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wide">FUTURO</span>}
                                            {isPast && <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wide">HISTÓRICO</span>}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Evitar conflictos
                                                    handleDelete(item.id);
                                                }} 
                                                disabled={deletingId === item.id}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                                                title="Eliminar este registro"
                                            >
                                                {deletingId === item.id ? <Loader size={16} className="animate-spin text-red-500"/> : <Trash2 size={16}/>}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {history.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No hay historial de precios registrado</td></tr>}
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