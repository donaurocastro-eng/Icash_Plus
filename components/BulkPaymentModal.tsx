import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calendar, CheckSquare, Square, FileText, ArrowRight } from 'lucide-react';
import { Contract, BulkPaymentFormData, BulkPaymentItem, Account, Tenant } from '../types';
import { AccountService } from '../services/accountService';
import { TenantService } from '../services/tenantService';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BulkPaymentFormData) => Promise<void>;
  contract: Contract | null;
  contractLabel: string;
  isSubmitting: boolean;
}

const BulkPaymentModal: React.FC<BulkPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  contractLabel,
  isSubmitting
}) => {
  const [items, setItems] = useState<BulkPaymentItem[]>([]);
  const [accountCode, setAccountCode] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
        if (isOpen && contract) {
            try {
                // 1. Load Accounts
                const accData = await AccountService.getAll();
                setAccounts(accData.filter(a => a.type === 'ACTIVO'));

                // 2. Load Tenant Details for Description
                const allTenants = await TenantService.getAll();
                const t = allTenants.find(x => x.code === contract.tenantCode);

                // 3. Generate Months
                generatePendingMonths(contract, t || null);
                
                setAccountCode('');
                setError(null);
            } catch (err) {
                console.error(err);
                setError("Error al cargar datos iniciales");
            }
        }
    };
    init();
  }, [isOpen, contract]);

  const generatePendingMonths = (c: Contract, t: Tenant | null) => {
      const list: BulkPaymentItem[] = [];
      let pointerDate = new Date(c.nextPaymentDate || c.startDate);
      // Adjust timezone to prevent day shifting
      pointerDate = new Date(pointerDate.valueOf() + pointerDate.getTimezoneOffset() * 60000);

      const tenantName = t ? t.fullName : 'Desconocido';
      const tenantCode = t ? t.code : c.tenantCode;

      for (let i = 0; i < 12; i++) { // Increased to 12 months since UI is now compact
          const monthName = pointerDate.toLocaleDateString('es-ES', { month: 'long' });
          const year = pointerDate.getFullYear();
          const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          
          // FORMATO: Contrato: CTR-060 Inquilino: INQ-016 Juan Pérez - Alquiler Enero 2025
          const description = `Contrato: ${c.code} Inquilino: ${tenantCode} ${tenantName} - Alquiler ${label} ${year}`;
          
          list.push({
              date: pointerDate.toISOString().split('T')[0],
              amount: c.amount,
              description: description,
              selected: i === 0 
          });
          
          pointerDate.setMonth(pointerDate.getMonth() + 1);
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
                    <FileText size={16} className="text-indigo-600"/> Cobro Masivo
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
        <div className="p-4 space-y-4 overflow-y-auto bg-slate-50/30">
            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-lg text-xs flex gap-2 shadow-sm">
                    <AlertCircle size={16} className="shrink-0"/>
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* Account Selector */}
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

            {/* Month List */}
            <div>
                <div className="flex justify-between items-end mb-2 px-1">
                    <label className="block text-xs font-bold text-slate-700">Meses a Pagar</label>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md">{selectedCount} seleccionados</span>
                </div>
                
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => toggleItem(idx)}
                            className={`
                                group flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200
                                ${item.selected 
                                    ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300 opacity-90 hover:opacity-100'
                                }
                            `}
                        >
                            <div className={`mt-0.5 transition-colors ${item.selected ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                                {item.selected ? <CheckSquare size={18} strokeWidth={2.5}/> : <Square size={18}/>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className={`text-xs font-bold truncate pr-2 ${item.selected ? 'text-indigo-900' : 'text-slate-600'}`}>
                                        {item.description.split(' - ')[1] ? item.description.split(' - ')[1] : item.description}
                                    </p>
                                    <p className={`font-mono font-bold text-xs ${item.selected ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {item.amount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                
                                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <Calendar size={10}/>
                                    <span>Vence: {item.date}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 font-mono bg-slate-50 p-1 rounded border border-slate-100 break-words whitespace-normal leading-tight">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
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
                        <>Procesando...</>
                    ) : (
                        <>
                            Registrar {selectedCount} Pagos <ArrowRight size={14}/>
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