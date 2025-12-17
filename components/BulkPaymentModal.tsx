import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calendar, CheckSquare, Square, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { Contract, BulkPaymentFormData, BulkPaymentItem, Account, Tenant, Transaction, ContractPrice } from '../types';
import { AccountService } from '../services/accountService';
import { TenantService } from '../services/tenantService';
import { TransactionService } from '../services/transactionService';
import { ContractService } from '../services/contractService';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BulkPaymentFormData) => Promise<void>;
  contract: Contract | null;
  contractLabel: string;
  isSubmitting: boolean;
  progressText?: string;
}

const BulkPaymentModal: React.FC<BulkPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  contractLabel,
  isSubmitting,
  progressText
}) => {
  const [items, setItems] = useState<BulkPaymentItem[]>([]);
  const [accountCode, setAccountCode] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contract) {
        loadFinancialData();
    }
  }, [isOpen, contract]);

  const loadFinancialData = async () => {
      if (!contract) return;
      setLoadingData(true);
      setError(null);
      setItems([]);

      try {
          const [accData, allTenants, allTxs, priceHistory] = await Promise.all([
              AccountService.getAll(),
              TenantService.getAll(),
              TransactionService.getAll(),
              ContractService.getPriceHistory(contract.code)
          ]);

          setAccounts(accData.filter(a => a.type === 'ACTIVO'));
          const tenant = allTenants.find(x => x.code === contract.tenantCode);

          calculatePendingPayments(contract, tenant || null, allTxs, priceHistory);
          
      } catch (err: any) {
          console.error(err);
          setError("Error al cargar historial financiero: " + err.message);
      } finally {
          setLoadingData(false);
      }
  };

  const getHistoricalPrice = (date: Date, history: ContractPrice[], currentAmount: number): number => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const match = history.find(p => p.startDate <= dateStr);
      return match ? match.amount : currentAmount;
  };

  const calculatePendingPayments = (
      c: Contract, 
      t: Tenant | null, 
      allTxs: Transaction[], 
      history: ContractPrice[]
  ) => {
      const list: BulkPaymentItem[] = [];
      const startParts = c.startDate.split('-');
      let pointerDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() + 12);
      const tenantName = t ? t.fullName : 'Desconocido';
      const tenantCode = t ? t.code : c.tenantCode;
      const contractTxs = allTxs.filter(tx => tx.contractCode === c.code && tx.type === 'INGRESO');

      while (pointerDate <= limitDate) {
          const year = pointerDate.getFullYear();
          const monthIndex = pointerDate.getMonth();
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          const paymentDay = c.paymentDay || 1;
          const safeDay = Math.min(paymentDay, daysInMonth);
          const dueDate = new Date(year, monthIndex, safeDay);
          const dueDateStr = dueDate.toISOString().split('T')[0];
          const periodStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
          const expectedAmount = getHistoricalPrice(dueDate, history, c.amount);
          const paidAmount = contractTxs.reduce((sum, tx) => {
              let match = false;
              if (tx.billablePeriod) { match = tx.billablePeriod === periodStr; } else {
                  const txDate = new Date(tx.date);
                  match = txDate.getFullYear() === year && txDate.getMonth() === monthIndex;
              }
              return match ? sum + tx.amount : sum;
          }, 0);

          const remaining = expectedAmount - paidAmount;
          if (remaining > 0.1) {
              const monthName = pointerDate.toLocaleDateString('es-ES', { month: 'long' });
              const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
              const isPartial = paidAmount > 0;
              const statusText = isPartial ? `(Saldo Pendiente)` : `(Mes Completo)`;
              const description = `Contrato: ${c.code} Inquilino: ${tenantCode} ${tenantName} - Alquiler ${label} ${year} ${statusText}`;
              const isFirstPending = list.length === 0;

              list.push({
                  date: dueDateStr,
                  amount: remaining,
                  description: description,
                  selected: isFirstPending,
                  billablePeriod: periodStr
              });
          }
          pointerDate.setMonth(pointerDate.getMonth() + 1);
          pointerDate.setDate(1); 
      }
      setItems(list);
  };

  const toggleItem = (index: number) => {
      const newItems = [...items];
      newItems[index].selected = !newItems[index].selected;
      setItems(newItems);
  };

  const handleSubmit = async () => {
      if (!accountCode) { setError("Selecciona una cuenta de destino."); return; }
      const selected = items.filter(i => i.selected);
      if (selected.length === 0) { setError("Selecciona al menos un mes para pagar."); return; }
      
      try {
          await onSubmit({
              contractCode: contract!.code,
              accountCode,
              items
          });
          onClose();
      } catch (e: any) {
          setError(e.message);
      }
  };

  if (!isOpen || !contract) return null;

  const totalAmount = items.filter(i => i.selected).reduce((sum, i) => sum + i.amount, 0);
  const selectedCount = items.filter(i => i.selected).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn scale-100">
        
        {/* HEADER */}
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
            <div>
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600"/> Cobro Masivo Inteligente
                </h3>
                <p className="text-[10px] text-indigo-600/80 font-medium mt-0.5 ml-0.5 truncate max-w-[250px]">{contractLabel}</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-1.5 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shadow-sm border border-slate-100"
            >
                <X size={16} />
            </button>
        </div>

        {/* BODY */}
        <div className="p-4 space-y-4 overflow-y-auto bg-slate-50/30 flex-1">
            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-lg text-xs flex gap-2 shadow-sm">
                    <AlertCircle size={16} className="shrink-0"/>
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1">
                <label className="block text-xs font-bold text-slate-700">Cuenta de Destino</label>
                <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700 font-medium text-xs"
                    value={accountCode}
                    onChange={e => setAccountCode(e.target.value)}
                >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(a => <option key={a.code} value={a.code}>{a.name} ({a.currency})</option>)}
                </select>
            </div>

            <div className="flex flex-col h-full min-h-[200px]">
                <div className="flex justify-between items-end mb-2 px-1">
                    <label className="block text-xs font-bold text-slate-700">Pagos Pendientes (Cronológico)</label>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md">{selectedCount} seleccionados</span>
                </div>
                
                {loadingData ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2">
                        <RefreshCw size={24} className="animate-spin text-indigo-500"/>
                        <span className="text-xs">Analizando historial...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <span className="text-xs font-medium">¡Estás al día! No hay pagos pendientes.</span>
                    </div>
                ) : (
                    <div className="space-y-2 overflow-y-auto pr-1">
                        {items.map((item, idx) => {
                            const isOldDebt = new Date(item.date) < new Date();
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => toggleItem(idx)}
                                    className={`
                                        group flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200
                                        ${item.selected 
                                            ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 opacity-90 hover:opacity-100'
                                        }
                                        ${isOldDebt && !item.selected ? 'bg-amber-50/50 border-amber-200' : ''}
                                    `}
                                >
                                    <div className={`mt-0.5 transition-colors ${item.selected ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                                        {item.selected ? <CheckSquare size={18} strokeWidth={2.5}/> : <Square size={18}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={`text-xs font-bold truncate pr-2 ${item.selected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {item.description.includes('- Alquiler') 
                                                    ? item.description.split('- Alquiler')[1].trim()
                                                    : item.description}
                                            </p>
                                            <p className={`font-mono font-bold text-xs ${item.selected ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {item.amount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                <Calendar size={10}/>
                                                <span className={isOldDebt ? 'text-amber-600 font-bold' : ''}>
                                                    {isOldDebt ? 'Venció: ' : 'Vence: '}{item.date}
                                                </span>
                                            </div>
                                            {isOldDebt && (
                                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 rounded-full font-bold">Atrasado</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total a Cobrar</span>
                <span className="text-lg font-extrabold text-emerald-600 flex items-center gap-1">
                    {totalAmount.toLocaleString('es-HN', {minimumFractionDigits: 2})}
                </span>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors text-xs"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedCount === 0}
                    className="flex-1 sm:flex-none px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-1.5 transition-all transform active:scale-95 text-xs"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                             <RefreshCw size={14} className="animate-spin"/> {progressText ? `Actualizado ${progressText}` : 'Procesando...'}
                        </span>
                    ) : (
                        <>
                            Pagar {selectedCount} Meses <ArrowRight size={14}/>
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPaymentModal;