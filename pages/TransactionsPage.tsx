import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, ArrowDownCircle, ArrowUpCircle, Calendar, ArrowRightLeft, Edit2, FileSpreadsheet, Upload, Filter } from 'lucide-react';
import { Transaction, TransactionFormData, Account, Category } from '../types';
import { TransactionService } from '../services/transactionService';
import { AccountService } from '../services/accountService';
import { CategoryService } from '../services/categoryService';
import TransactionModal from '../components/TransactionModal';
import * as XLSX from 'xlsx';

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helpers for Excel
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccountType, setSelectedAccountType] = useState<'ALL' | 'ACTIVO' | 'PASIVO'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTransactions = async () => {
    try {
      const [txData, accData, catData] = await Promise.all([
          TransactionService.getAll(),
          AccountService.getAll(),
          CategoryService.getAll()
      ]);
      setTransactions(txData);
      setAccounts(accData);
      setCategories(catData);
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

  const handleUpdate = async (data: TransactionFormData) => {
      if (!editingTransaction) return;
      setIsSubmitting(true);
      try {
          await TransactionService.update(editingTransaction.code, data);
          await loadTransactions();
          setIsModalOpen(false);
          setEditingTransaction(null);
      } catch (e: any) {
          alert(e.message);
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

  // --- EXCEL LOGIC START ---
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Fecha (YYYY-MM-DD)', 'Descripcion', 'Monto', 'Tipo (GASTO/INGRESO)', 'Codigo_Categoria', 'Codigo_Cuenta', 'Codigo_Propiedad (Opcional)'];
    const example = ['2024-03-15', 'Compra Supermercado', 1500.50, 'GASTO', 'CAT-EXP-001', 'CTA-001', ''];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
    XLSX.writeFile(wb, "plantilla_transacciones.xlsx");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const processExcelFile = async (file: File) => {
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        
        if (json.length === 0) { alert("Archivo vacío"); return; }

        let successCount = 0;
        let errorCount = 0;

        for (const row of json) {
            try {
                // Map Excel columns to FormData
                const date = row['Fecha (YYYY-MM-DD)'] || row['Fecha'] || new Date().toISOString().split('T')[0];
                const desc = row['Descripcion'] || row['Descripción'] || 'Sin descripción';
                const amount = parseFloat(row['Monto']) || 0;
                const typeRaw = (row['Tipo (GASTO/INGRESO)'] || row['Tipo'] || 'GASTO').toUpperCase();
                const type = (typeRaw === 'INGRESO') ? 'INGRESO' : 'GASTO'; // Default to GASTO if invalid
                const catCode = row['Codigo_Categoria'] || row['Categoria'];
                const accCode = row['Codigo_Cuenta'] || row['Cuenta'];
                const propCode = row['Codigo_Propiedad (Opcional)'] || row['Propiedad'] || '';

                if (!amount || !catCode || !accCode) {
                    console.warn("Skipping invalid row", row);
                    errorCount++;
                    continue;
                }

                await TransactionService.create({
                    date: String(date),
                    description: String(desc),
                    amount: amount,
                    type: type as any,
                    categoryCode: String(catCode),
                    accountCode: String(accCode),
                    propertyCode: String(propCode)
                });
                successCount++;
            } catch (err) {
                console.error("Row error", err);
                errorCount++;
            }
        }
        
        await loadTransactions();
        alert(`Importación finalizada.\n✅ Exitosos: ${successCount}\n❌ Fallidos: ${errorCount}`);
      } catch (err) {
          console.error(err);
          alert("Error al leer el archivo Excel.");
      } finally {
          setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };
  // --- EXCEL LOGIC END ---

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch(e) { return isoString; }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amount);
  };

  const getAccountType = (accCode: string): 'ACTIVO' | 'PASIVO' | undefined => {
      const acc = accounts.find(a => a.code === accCode);
      return acc?.type;
  };

  const filteredTransactions = transactions.filter(t => {
    // Safety check for date string
    if (!t.date || typeof t.date !== 'string') return false;

    let tYear = 0;
    let tMonth = 0;

    try {
        const date = new Date(t.date);
        tYear = date.getFullYear();
        
        // Use split if possible for accurate accounting month, fallback to date object
        const parts = t.date.split('-');
        if (parts.length >= 2) {
            tMonth = parseInt(parts[1]) - 1; 
        } else {
            tMonth = date.getMonth(); 
        }
    } catch(e) { return false; }

    const matchesDate = tYear === selectedYear && tMonth === selectedMonth;

    const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.categoryName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.accountName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesType = true;
    if (selectedAccountType !== 'ALL') {
        const accType = getAccountType(t.accountCode);
        matchesType = accType === selectedAccountType;
        if (t.type === 'TRANSFERENCIA' && t.destinationAccountCode) {
             const destType = getAccountType(t.destinationAccountCode);
             if (destType === selectedAccountType) matchesType = true;
        }
    }
    
    return matchesDate && matchesSearch && matchesType;
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
          <p className="text-slate-500">Registro detallado de ingresos, gastos y transferencias.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Excel Actions Group */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="hidden" />
                <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-md transition-colors text-sm font-medium border-r border-slate-100" title="Descargar Plantilla Excel">
                    <FileSpreadsheet size={16} />
                    <span className="hidden sm:inline">Plantilla</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50" title="Subir archivo Excel">
                    {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full"/> : <Upload size={16} />}
                    <span className="hidden sm:inline">Importar</span>
                </button>
            </div>

            <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

            <button 
            onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
            >
            <Plus size={20} />
            <span className="font-medium">Registrar Movimiento</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
             <Filter size={16} className="text-slate-400" />
             <span className="text-sm font-medium text-slate-600 hidden sm:inline">Filtros:</span>
             
             {/* Account Type Filter */}
             <select 
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-brand-500"
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value as any)}
             >
                <option value="ALL">Todas las Cuentas</option>
                <option value="ACTIVO">Activos (Bancos/Efectivo)</option>
                <option value="PASIVO">Pasivos (Tarjetas/Deudas)</option>
             </select>

             <select 
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-brand-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
             >
                {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i}>{new Date(0, i).toLocaleDateString('es-ES', {month: 'short'}).toUpperCase()}</option>
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
                        {tx.type === 'TRANSFERENCIA' ? (
                            <div className="flex items-center font-bold text-blue-600">
                                <ArrowRightLeft size={14} className="mr-1.5" />
                                {formatMoney(tx.amount)}
                            </div>
                        ) : (
                            <div className={`flex items-center font-bold ${tx.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === 'INGRESO' ? <ArrowUpCircle size={14} className="mr-1.5" /> : <ArrowDownCircle size={14} className="mr-1.5" />}
                                {formatMoney(tx.amount)}
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700">{tx.categoryName}</span>
                        <span className="text-xs text-slate-400">{tx.categoryCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {tx.type === 'TRANSFERENCIA' && tx.destinationAccountCode ? (
                            <div className="flex items-center gap-1 text-xs">
                                <span>{tx.accountName}</span>
                                <ArrowRightLeft size={10} className="text-blue-400"/>
                                <span className="font-bold">{tx.destinationAccountName}</span>
                            </div>
                        ) : (
                            <>
                                <span className="text-slate-700">{tx.accountName}</span>
                                <span className="text-xs text-slate-400">{tx.accountCode}</span>
                            </>
                        )}
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
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => { setEditingTransaction(tx); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                            title="Editar"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => handleDelete(tx.code)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>
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
        onSubmit={editingTransaction ? handleUpdate : handleCreate}
        editingTransaction={editingTransaction}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default TransactionsPage;