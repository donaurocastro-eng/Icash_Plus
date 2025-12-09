import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calendar, CheckSquare, Square, DollarSign, FileText, ArrowRight } from 'lucide-react';
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

      for (let i = 0; i < 6; i++) {
          const monthName = pointerDate.toLocaleDateString('es-ES', { month: 'long' });
          const year = pointerDate.getFullYear();
          const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          
          // FORMATO SOLICITADO:
          // Contrato: CTR-060 Inquilino: INQ-016 Juan Pérez - Alquiler Enero 2025
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn scale-100">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                    <FileText size={22} className="text-indigo-600"/> Cobro Masivo
                </h3>
                <p className="text-xs text-indigo-600/80 font-medium mt-1 ml-1">{contractLabel}</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shadow-sm border border-slate-100"
            >
                <X size={20} />
            </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 overflow-y-auto bg-slate-50/30">
            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-sm flex gap-3 shadow-sm">
                    <AlertCircle size={20} className="shrink-0"/>
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* Account Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <label className="block text-sm font-bold text-slate-700">Cuenta de Destino</label>
                <select 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700 font-medium"
                    value={accountCode}
                    onChange={e => setAccountCode(e.target.value)}
                >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(a => <option key={a.code} value={a.code}>{a.name} ({a.currency})</option>)}
                </select>
                <p className="text-[10px] text-slate-400 px-1">El dinero ingresará a esta cuenta.</p>
            </div>

            {/* Month List */}
            <div>
                <div className="flex justify-between items-end mb-3 px-1">
                    <label className="block text-sm font-bold text-slate-700">Meses a Pagar</label>
                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md">{selectedCount} seleccionados</span>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => toggleItem(idx)}
                            className={`
                                group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                                ${item.selected 
                                    ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm opacity-80 hover:opacity-100'
                                }
                            `}
                        >
                            <div className={`mt-1 transition-colors ${item.selected ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                                {item.selected ? <CheckSquare size={22} strokeWidth={2.5}/> : <Square size={22}/>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className={`text-sm font-bold truncate pr-2 ${item.selected ? 'text-indigo-900' : 'text-slate-600'}`}>
                                        {item.description.split(' - ')[1] ? item.description.split(' - ')[1] : item.description}
                                    </p>
                                    <p className={`font-mono font-bold text-sm ${item.selected ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {item.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                                    </p>
                                </div>
                                
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                    <Calendar size={12}/>
                                    <span>Vence: {item.date}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-mono bg-slate-50 p-2 rounded border border-slate-100 break-words whitespace-normal">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Cobrar</span>
                <span className="text-3xl font-extrabold text-emerald-600 flex items-center gap-1">
                    <DollarSign size={24} strokeWidth={3} className="text-emerald-500"/> 
                    {totalAmount.toLocaleString('es-HN', {minimumFractionDigits: 2})}
                </span>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
                <button 
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedCount === 0}
                    className="flex-1 sm:flex-none px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all transform active:scale-95 text-sm"
                >
                    {isSubmitting ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            Registrar {selectedCount} Pagos <ArrowRight size={18}/>
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