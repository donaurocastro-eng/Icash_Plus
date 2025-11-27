import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Wallet,
  Building,
  CreditCard
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
  
  // Filters for Cashflow
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  const formatMoney = (amount: number, currency: 'HNL' | 'USD' = 'HNL') => {
    return new Intl.NumberFormat(currency === 'HNL' ? 'es-HN' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // --- BALANCE SHEET CALCULATION ---
  const calculateBalanceSheet = () => {
    const sheet = {
      hnl: { assets: 0, liabilities: 0, equity: 0, details: [] as any[] },
      usd: { assets: 0, liabilities: 0, equity: 0, details: [] as any[] }
    };

    // Accounts
    accounts.forEach(acc => {
      const target = acc.currency === 'HNL' ? sheet.hnl : sheet.usd;
      if (acc.type === 'ACTIVO') {
          target.assets += acc.initialBalance;
          target.details.push({ name: acc.name, type: 'ACTIVO', amount: acc.initialBalance, category: 'Cuenta Bancaria' });
      } else {
          target.liabilities += acc.initialBalance; 
          target.details.push({ name: acc.name, type: 'PASIVO', amount: acc.initialBalance, category: 'Deuda/Tarjeta' });
      }
    });

    // Properties (Assets)
    properties.forEach(prop => {
      const target = prop.currency === 'HNL' ? sheet.hnl : sheet.usd;
      target.assets += prop.value;
      target.details.push({ name: prop.name, type: 'ACTIVO', amount: prop.value, category: 'Propiedad' });
    });

    // Equity
    sheet.hnl.equity = sheet.hnl.assets - sheet.hnl.liabilities;
    sheet.usd.equity = sheet.usd.assets - sheet.usd.liabilities;

    return sheet;
  };

  // --- CASHFLOW CALCULATION ---
  const calculateCashflow = () => {
    const filtered = transactions.filter(tx => {
      const d = new Date(tx.date);
      // Adjust for timezone if needed, but simple slicing is safer for YYYY-MM-DD
      const [y, m] = tx.date.split('-').map(Number);
      return y === selectedYear && (m - 1) === selectedMonth;
    });

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

  const balance = calculateBalanceSheet();
  const cashflow = calculateCashflow();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reportes Financieros</h1>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
          <button 
            onClick={() => setActiveTab('BALANCE')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BALANCE' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Balance General
          </button>
          <button 
             onClick={() => setActiveTab('CASHFLOW')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'CASHFLOW' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Flujo Mensual
          </button>
        </div>
      </div>

      {/* --- BALANCE SHEET TAB --- */}
      {activeTab === 'BALANCE' && (
        <div className="space-y-8">
            {/* HNL SECTION */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><div className="w-2 h-6 bg-indigo-600 rounded-full"></div> Lempiras (HNL)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-sm">Total Activos</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatMoney(balance.hnl.assets, 'HNL')}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-sm">Total Pasivos</p>
                        <p className="text-2xl font-bold text-rose-600">{formatMoney(balance.hnl.liabilities, 'HNL')}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <p className="text-indigo-600 text-sm font-medium">Patrimonio Neto</p>
                        <p className="text-2xl font-bold text-indigo-900">{formatMoney(balance.hnl.equity, 'HNL')}</p>
                    </div>
                </div>
                {/* Detail Table HNL */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium text-slate-500">
                            <tr><th className="p-3">Cuenta / Propiedad</th><th className="p-3">Tipo</th><th className="p-3 text-right">Monto</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {balance.hnl.details.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="font-medium text-slate-700">{item.name}</div>
                                        <div className="text-xs text-slate-400">{item.category}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.type}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono">{formatMoney(item.amount, 'HNL')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* USD SECTION */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><div className="w-2 h-6 bg-emerald-600 rounded-full"></div> Dólares (USD)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-sm">Total Activos</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatMoney(balance.usd.assets, 'USD')}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-sm">Total Pasivos</p>
                        <p className="text-2xl font-bold text-rose-600">{formatMoney(balance.usd.liabilities, 'USD')}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                        <p className="text-emerald-600 text-sm font-medium">Patrimonio Neto</p>
                        <p className="text-2xl font-bold text-emerald-900">{formatMoney(balance.usd.equity, 'USD')}</p>
                    </div>
                </div>
                {/* Detail Table USD */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium text-slate-500">
                            <tr><th className="p-3">Cuenta / Propiedad</th><th className="p-3">Tipo</th><th className="p-3 text-right">Monto</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {balance.usd.details.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="font-medium text-slate-700">{item.name}</div>
                                        <div className="text-xs text-slate-400">{item.category}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.type}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono">{formatMoney(item.amount, 'USD')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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