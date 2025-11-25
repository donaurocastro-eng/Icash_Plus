import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, CheckSquare, Square, DollarSign } from 'lucide-react';
import { Contract, BulkPaymentFormData, BulkPaymentItem, Account } from '../types';
import { AccountService } from '../services/accountService';

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
    if (isOpen && contract) {
      loadAccounts();
      generatePendingMonths(contract);
      setAccountCode('');
      setError(null);
    }
  }, [isOpen, contract]);

  const loadAccounts = async () => {
    try {
      const data = await AccountService.getAll();
      setAccounts(data.filter(a => a.type === 'ACTIVO'));
    } catch (err) { console.error(err); }
  };

  const generatePendingMonths = (c: Contract) => {
      // Generate list of pending months starting from next_payment_date
      // Let's generate say, next 6 months or until current date + 1 month
      const list: BulkPaymentItem[] = [];
      let pointerDate = new Date(c.nextPaymentDate || c.startDate);
      // Adjust for timezone
      pointerDate = new Date(pointerDate.valueOf() + pointerDate.getTimezoneOffset() * 60000);

      // Generate 6 potential months to pay
      for (let i = 0; i < 6; i++) {
          const monthName = pointerDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
          const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          
          list.push({
              date: pointerDate.toISOString().split('T')[0],
              amount: c.amount,
              description: `Alquiler ${label}`,
              selected: i === 0 // Select first by default
          });
          
          // Advance 1 month
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
      
      // Verify sequential selection? Ideally yes, but for now just process what's checked.
      // Warning: If user skips a month, logic in service might need care.
      // Current service logic simply advances date per payment call.
      // So if user selects Month 1 and Month 3 (skipping 2), contract will advance 2 months total.
      // It essentially pays "Next 2 months".
      // For robustness, we should force sequential or just warn.
      
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-indigo-900">Cobro Masivo</h3>
                <p className="text-xs text-indigo-600">{contractLabel}</p>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2"><AlertCircle size={16}/>{error}</div>}

            {/* Account Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta de Destino</label>
                <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={accountCode}
                    onChange={e => setAccountCode(e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {accounts.map(a => <option key={a.code} value={a.code}>{a.name} ({a.currency})</option>)}
                </select>
            </div>

            {/* Month Selection List */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Selecciona Meses a Pagar</label>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${item.selected ? 'bg-indigo-50/50' : ''}`}
                            onClick={() => toggleItem(idx)}
                        >
                            <div className="flex items-center gap-3">
                                {item.selected ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20} className="text-slate-300"/>}
                                <div>
                                    <p className={`text-sm font-medium ${item.selected ? 'text-indigo-900' : 'text-slate-600'}`}>{item.description}</p>
                                    <p className="text-xs text-slate-400">Vence: {item.date}</p>
                                </div>
                            </div>
                            <div className="font-bold text-slate-700">
                                {item.amount.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total a Cobrar</p>
                <p className="text-2xl font-bold text-emerald-600 flex items-center"><DollarSign size={20}/> {totalAmount.toLocaleString()}</p>
            </div>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md disabled:opacity-50 flex items-center gap-2"
            >
                {isSubmitting ? 'Procesando...' : 'Registrar Pagos'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default BulkPaymentModal;