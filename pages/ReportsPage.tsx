import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Wallet,
  Building,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { PropertyService } from '../services/propertyService';
import { Account, Transaction, Property, CategoryType } from '../types';

type ReportTab = 'BALANCE' | 'CASHFLOW';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('BALANCE');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Filters & Settings
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [exchangeRate, setExchangeRate] = useState<number>(25.00); // Default rate

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [accData, txData, propData] = await Promise.all([
          AccountService.getAll(),
          TransactionService.getAll(),
          PropertyService.getAll()
        ]);
        setAccounts(accData);
        setTransactions(txData);
        setProperties(propData);
      } catch (e) {
        console.error("Error loading report data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // --- BALANCE SHEET CALCULATION (CONSOLIDATED IN HNL) ---
  const calculateConsolidatedBalance = () => {
    const balance = {
      assets: { total: 0, details: [] as any[] },
      liabilities: { total: 0, details: [] as any[] },
      equity: 0
    };

    // Helper to convert and sum
    const processItem = (amount: number, currency: string, name: string, type: 'ACTIVO' | 'PASIVO', category: string, code: string) => {
        let finalAmount = amount;
        // Convert USD to HNL
        if (currency === 'USD') {
            finalAmount = amount * exchangeRate;
        }

        if (type === 'ACTIVO') {
            balance.assets.total += finalAmount;
            balance.assets.details.push({ name, code, amountHNL: finalAmount, original: amount, currency, category });
        } else {
            balance.liabilities.total += finalAmount;
            balance.liabilities.details.push({ name, code, amountHNL: finalAmount, original: amount, currency, category });
        }
    };

    // 1. Accounts
    accounts.forEach(acc => {
        processItem(acc.initialBalance, acc.currency, acc.name, acc.type, acc.type === 'ACTIVO' ? 'Activos Líquidos' : 'Pasivos / Deudas', acc.code);
    });

    // 2. Properties (Always Assets)
    properties.forEach(prop => {
        processItem(prop.value, prop.currency, prop.name, 'ACTIVO', 'Bienes Inmuebles', prop.code);
    });

    balance.equity = balance.assets.total - balance.liabilities.total;
    return balance;
  };

  // --- CASHFLOW CALCULATION ---
  const calculateCashflow = () => {
    const filtered = transactions.filter(tx => {
      const d = new Date(tx.date);
      const [y, m] = tx.date.split('-').map(Number);
      return y === selectedYear && (m - 1) === selectedMonth;
    });

    // Simple sum, assuming mixed currency just adds up for now or convert if we had currency in transaction. 
    // Assuming transactions are mainly HNL for cashflow or 1:1 for simplicity in this view. 
    // Ideally, transactions should store currency too.
    const income = filtered.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'GASTO').reduce((sum, t) => sum + t.amount, 0);
    
    const categories: Record<string, { name: string, type: CategoryType, amount: number }> = {};
    
    filtered.forEach(tx => {
      const catName = tx.categoryName || 'Sin Categoría';
      if (!categories[catName]) {
        categories[catName] = { name: catName, type: tx.type, amount: 0 };
      }
      categories[catName].amount += tx.amount;
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      net: income - expense,
      breakdown: Object.values(categories).sort((a, b) => b.amount - a.amount)
    };
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  const balance = calculateConsolidatedBalance();
  const cashflow = calculateCashflow();

  // Grouping Assets for Display
  const liquidAssets = balance.assets.details.filter(d => d.category === 'Activos Líquidos');
  const realEstateAssets = balance.assets.details.filter(d => d.category === 'Bienes Inmuebles');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reportes Financieros</h1>
        
        <div className="flex gap-4 items-center">
            {/* Exchange Rate Input */}
            {activeTab === 'BALANCE' && (
                <div className="flex items-center bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-md border border-slate-600">
                    <span className="text-xs text-slate-300 mr-2 font-medium">Tasa Dólar:</span>
                    <input 
                        type="number" 
                        step="0.01"
                        className="w-16 bg-transparent text-right font-mono font-bold outline-none border-b border-slate-500 focus:border-brand-400"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('BALANCE')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BALANCE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                Balance General
            </button>
            <button 
                onClick={() => setActiveTab('CASHFLOW')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'CASHFLOW' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                Flujo Mensual
            </button>
            </div>
        </div>
      </div>

      {/* --- BALANCE SHEET TAB (DARK THEME INSPIRED) --- */}
      {activeTab === 'BALANCE' && (
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden text-slate-100 p-6">
            <h2 className="text-xl font-bold mb-6">Balance General (Consolidado en Lempiras)</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: ASSETS */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-indigo-500/50 pb-2">
                        <h3 className="font-bold text-indigo-400 text-lg">Activos (lo que posees)</h3>
                    </div>

                    {/* Liquid Assets */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Activos Líquidos / Cuentas</h4>
                        <div className="space-y-2">
                            {liquidAssets.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors">
                                    <span className="text-slate-300">[{item.code}] {item.name} {item.currency === 'USD' && <span className="text-xs text-emerald-500 ml-1">(USD)</span>}</span>
                                    <span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Real Estate */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-4">Bienes Inmuebles</h4>
                        <div className="space-y-2">
                            {realEstateAssets.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors">
                                    <span className="text-slate-300">[{item.code}] {item.name} {item.currency === 'USD' && <span className="text-xs text-emerald-500 ml-1">(USD)</span>}</span>
                                    <span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Assets */}
                    <div className="pt-4 border-t border-slate-700 flex justify-between items-end mt-4">
                        <span className="text-slate-400 font-bold">TOTAL ACTIVOS</span>
                        <span className="text-2xl font-bold text-emerald-400">{formatMoney(balance.assets.total)}</span>
                    </div>
                </div>

                {/* RIGHT COLUMN: LIABILITIES */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-rose-500/50 pb-2">
                        <h3 className="font-bold text-rose-400 text-lg">Pasivos (lo que debes)</h3>
                    </div>

                     {/* Liabilities List */}
                     <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cuentas de Pasivo / Deudas</h4>
                        <div className="space-y-2">
                            {balance.liabilities.details.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors">
                                    <span className="text-slate-300">[{item.code}] {item.name} {item.currency === 'USD' && <span className="text-xs text-emerald-500 ml-1">(USD)</span>}</span>
                                    <span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span>
                                </div>
                            ))}
                            {balance.liabilities.details.length === 0 && <p className="text-slate-600 italic text-sm">Sin deudas registradas</p>}
                        </div>
                    </div>

                    {/* Total Liabilities */}
                    <div className="pt-4 border-t border-slate-700 flex justify-between items-end mt-4">
                        <span className="text-slate-400 font-bold">TOTAL PASIVOS</span>
                        <span className="text-2xl font-bold text-rose-400">{formatMoney(balance.liabilities.total)}</span>
                    </div>

                    {/* NET WORTH SUMMARY */}
                    <div className="mt-12 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-slate-400 text-sm uppercase tracking-wider font-bold">Patrimonio Neto</p>
                                <p className="text-xs text-slate-500">(Activos - Pasivos)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-white">{formatMoney(balance.equity)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- CASHFLOW TAB --- */}
      {activeTab === 'CASHFLOW' && (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={20} />
                    <span className="font-medium text-sm">Periodo:</span>
                </div>
                <select 
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                    {Array.from({length: 12}, (_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleDateString('es-ES', {month: 'long'}).toUpperCase()}</option>
                    ))}
                </select>
                <select 
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                    <p className="text-emerald-600 font-medium text-sm mb-1">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-emerald-800">{formatMoney(cashflow.totalIncome)}</p>
                </div>
                <div className="bg-rose-50 p-5 rounded-xl border border-rose-100">
                    <p className="text-rose-600 font-medium text-sm mb-1">Gastos Totales</p>
                    <p className="text-2xl font-bold text-rose-800">{formatMoney(cashflow.totalExpense)}</p>
                </div>
                <div className={`p-5 rounded-xl border ${cashflow.net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                    <p className={`font-medium text-sm mb-1 ${cashflow.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Flujo Neto</p>
                    <p className={`text-2xl font-bold ${cashflow.net >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatMoney(cashflow.net)}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Detalle por Categoría</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3 text-right">Monto</th>
                            <th className="px-6 py-3 text-right">% del Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cashflow.breakdown.map((cat, idx) => {
                             const totalBase = cat.type === 'INGRESO' ? cashflow.totalIncome : cashflow.totalExpense;
                             const percentage = totalBase > 0 ? (cat.amount / totalBase) * 100 : 0;
                             return (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-700">{cat.name}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${cat.type === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {cat.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-slate-700">{formatMoney(cat.amount)}</td>
                                    <td className="px-6 py-3 text-right text-slate-500">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs">{percentage.toFixed(1)}%</span>
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${cat.type === 'INGRESO' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                             );
                        })}
                        {cashflow.breakdown.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">No hay movimientos en este periodo</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;