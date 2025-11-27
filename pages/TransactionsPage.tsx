import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, ArrowDownCircle, ArrowUpCircle, Calendar, Tag, CreditCard } from 'lucide-react';
import { Transaction, TransactionFormData } from '../types';
import { TransactionService } from '../services/transactionService';
import TransactionModal from '../components/TransactionModal';

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTransactions = async () => {
    try {
      const data = await TransactionService.getAll();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load transactions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleCreate = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      await TransactionService.create(data);
      await loadTransactions();
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar la transacción ${code}? Esto revertirá el saldo de la cuenta.`)) return;
    try {
      await TransactionService.delete(code);
      await loadTransactions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Format date DD/MM/YYYY
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amount);
  };

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    // Check Year and Month (Javascript months are 0-11)
    const tYear = date.getFullYear();
    // Extract month manually from string YYYY-MM-DD to be safe from timezone
    const tMonth = parseInt(t.date.split('-')[1]) - 1; 

    const matchesDate = tYear === selectedYear && tMonth === selectedMonth;

    const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDate && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transacciones</h1>
          <p className="text-slate-500">Registro detallado de ingresos y gastos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={20} />
          <span className="font-medium">Registrar Movimiento</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por descripción, cuenta..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
             <select 
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-brand-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
             >
                {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i}>{new Date(0, i).toLocaleDateString('es-ES', {month: 'long'}).toUpperCase()}</option>
                ))}
             </select>
             <select 
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-brand-500"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
             >
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">Código / Fecha</th>
                <th className="px-4 py-3 font-semibold">Descripción</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Cuenta</th>
                <th className="px-4 py-3 font-semibold">Propiedad</th>
                <th className="px-4 py-3 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <p>No hay transacciones registradas para este periodo</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.code} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-brand-600">{tx.code}</span>
                        <div className="flex items-center text-slate-500 text-xs mt-0.5">
                          <Calendar size={10} className="mr-1" />
                          {formatDate(tx.date)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700 font-medium block max-w-xs truncate" title={tx.description}>
                        {tx.description}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center font-bold ${tx.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'INGRESO' ? <ArrowUpCircle size={14} className="mr-1.5" /> : <ArrowDownCircle size={14} className="mr-1.5" />}
                        {formatMoney(tx.amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700">{tx.categoryName}</span>
                        <span className="text-xs text-slate-400">{tx.categoryCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700">{tx.accountName}</span>
                        <span className="text-xs text-slate-400">{tx.accountCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {tx.propertyCode ? (
                         <div className="flex flex-col">
                          <span className="text-slate-700 text-xs">{tx.propertyName || '-'}</span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded w-fit">{tx.propertyCode}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleDelete(tx.code)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default TransactionsPage;