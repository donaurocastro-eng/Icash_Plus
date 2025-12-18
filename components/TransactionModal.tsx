import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Calendar, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, CreditCard, Tag } from 'lucide-react';
import { TransactionFormData, Category, Account, Transaction } from '../types';
import { CategoryService } from '../services/categoryService';
import { AccountService } from '../services/accountService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  editingTransaction?: Transaction | null;
  isSubmitting: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingTransaction,
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    type: 'GASTO',
    categoryCode: '',
    accountCode: '',
    destinationAccountCode: '',
    propertyCode: '',
    propertyName: '',
    serviceCode: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
          setFormData({
            date: editingTransaction.date,
            description: editingTransaction.description,
            amount: editingTransaction.amount,
            type: editingTransaction.type,
            categoryCode: editingTransaction.categoryCode,
            accountCode: editingTransaction.accountCode,
            destinationAccountCode: '', // Editing transfers not supported directly
            propertyCode: editingTransaction.propertyCode || '',
            propertyName: editingTransaction.propertyName || '',
            serviceCode: editingTransaction.serviceCode || ''
          });
      } else {
          setFormData({
            date: new Date().toISOString().split('T')[0],
            description: '',
            amount: 0,
            type: 'GASTO',
            categoryCode: '',
            accountCode: '',
            destinationAccountCode: '',
            propertyCode: '',
            propertyName: '',
            serviceCode: ''
          });
      }
      setError(null);
    }
  }, [isOpen, editingTransaction]);

  const loadDependencies = async () => {
    try {
      const [cats, accs] = await Promise.all([
        CategoryService.getAll(),
        AccountService.getAll()
      ]);
      setCategories(cats);
      setAccounts(accs);
    } catch (err) {
      console.error("Error loading dependencies", err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.amount || !formData.accountCode) {
      setError("Descripción, Monto y Cuenta Origen son obligatorios.");
      return;
    }

    if (formData.type === 'TRANSFERENCIA') {
        if (!formData.destinationAccountCode) {
            setError("Selecciona la cuenta de destino para la transferencia.");
            return;
        }
        if (formData.accountCode === formData.destinationAccountCode) {
            setError("No puedes transferir a la misma cuenta.");
            return;
        }
    } else {
        if (!formData.categoryCode) {
            setError("La Categoría es obligatoria.");
            return;
        }
    }
    
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Error al guardar la transacción.");
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {editingTransaction ? `Modificando registro existente` : 'Registra un movimiento'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selection */}
          <div className="grid grid-cols-3 gap-3">
            <div 
              className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center transition-all ${formData.type === 'GASTO' ? 'bg-rose-50 border-rose-500 text-rose-700 font-medium ring-1 ring-rose-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'GASTO', categoryCode: ''})}
            >
              <ArrowDownCircle size={20} className="mb-1" />
              <span className="text-xs font-bold">GASTO</span>
            </div>
            <div 
              className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center transition-all ${formData.type === 'INGRESO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium ring-1 ring-emerald-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setFormData({...formData, type: 'INGRESO', categoryCode: ''})}
            >
              <ArrowUpCircle size={20} className="mb-1" />
              <span className="text-xs font-bold">INGRESO</span>
            </div>
            {!editingTransaction && (
                <div 
                className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center transition-all ${formData.type === 'TRANSFERENCIA' ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium ring-1 ring-blue-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setFormData({...formData, type: 'TRANSFERENCIA', categoryCode: 'SYSTEM'})}
                >
                <ArrowRightLeft size={20} className="mb-1" />
                <span className="text-xs font-bold">TRANSFERIR</span>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono text-lg"
                  placeholder="0.00"
                  value={formData.amount || ''}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none h-24"
                  placeholder={formData.type === 'TRANSFERENCIA' ? "Pago de Tarjeta, Ahorro..." : "Detalle..."}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                    {formData.type === 'TRANSFERENCIA' ? 'Desde (Cuenta Origen)' : 'Cuenta'}
                </label>
                <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                    value={formData.accountCode}
                    onChange={e => setFormData({...formData, accountCode: e.target.value})}
                    >
                    <option value="">Seleccione cuenta...</option>
                    {accounts.map(acc => (
                        <option key={acc.code} value={acc.code}>
                        {acc.name} ({acc.currency}) - {acc.initialBalance}
                        </option>
                    ))}
                    </select>
                </div>
              </div>

              {formData.type === 'TRANSFERENCIA' ? (
                  <div className="space-y-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-sm font-bold text-blue-800 mb-1">Hacia (Cuenta Destino)</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                        <select
                        className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={formData.destinationAccountCode}
                        onChange={e => setFormData({...formData, destinationAccountCode: e.target.value})}
                        >
                        <option value="">Seleccione destino...</option>
                        {accounts
                            .filter(a => a.code !== formData.accountCode)
                            .map(acc => (
                            <option key={acc.code} value={acc.code}>
                            {acc.name} ({acc.currency})
                            </option>
                        ))}
                        </select>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                        Se crearán automáticamente dos transacciones: Un <strong>GASTO</strong> en el origen y un <strong>INGRESO</strong> en el destino.
                    </p>
                  </div>
              ) : (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Categoría</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                        value={formData.categoryCode}
                        onChange={e => setFormData({...formData, categoryCode: e.target.value})}
                        >
                        <option value="">Seleccione categoría</option>
                        {filteredCategories.length === 0 && <option disabled>No hay categorías disponibles</option>}
                        {filteredCategories.map(cat => (
                            <option key={cat.code} value={cat.code}>
                            {cat.name}
                            </option>
                        ))}
                        </select>
                    </div>
                  </div>
              )}

              {/* Property & Service Section (Optional) */}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Información Adicional (Opcional)</span>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="Cod. Propiedad"
                    value={formData.propertyCode}
                    onChange={e => setFormData({...formData, propertyCode: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="Cod. Servicio"
                    value={formData.serviceCode}
                    onChange={e => setFormData({...formData, serviceCode: e.target.value})}
                  />
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  placeholder="Nombre Propiedad"
                  value={formData.propertyName}
                  onChange={e => setFormData({...formData, propertyName: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  {editingTransaction ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;