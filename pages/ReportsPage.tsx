
import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Building,
  Search
} from 'lucide-react';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { PropertyService } from '../services/propertyService';
import { LoanService } from '../services/loanService';
import { Account, Transaction, Property, Loan, CategoryType } from '../types';
import ReportDrilldownModal from '../components/ReportDrilldownModal';

type ReportTab = 'BALANCE' | 'CASHFLOW' | 'BY_PROPERTY';

interface MonthlyStats {
    monthIndex: number;
    monthName: string;
    income: number;
    expense: number;
    net: number;
    transactions: Transaction[];
}

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('BALANCE');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [exchangeRate, setExchangeRate] = useState<number>(25.00); 

  // Property Report State
  const [selectedPropCode, setSelectedPropCode] = useState('');
  const [viewingMonthDetails, setViewingMonthDetails] = useState<MonthlyStats | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [accData, txData, propData, loanData] = await Promise.all([
          AccountService.getAll(),
          TransactionService.getAll(),
          PropertyService.getAll(),
          LoanService.getAll()
        ]);
        setAccounts(accData);
        setTransactions(txData);
        setProperties(propData);
        setLoans(loanData);
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

  // --- BALANCE SHEET ---
  const calculateConsolidatedBalance = () => {
    const balance = {
      assets: { total: 0, details: [] as any[] },
      liabilities: { total: 0, details: [] as any[] },
      equity: 0
    };

    const processItem = (amount: number, currency: string, name: string, type: 'ACTIVO' | 'PASIVO', category: string, code: string) => {
        // Force Number type strictly to avoid string concatenation
        const numAmount = Number(amount);
        let finalAmount = numAmount;
        
        if (currency === 'USD') finalAmount = numAmount * exchangeRate;

        if (type === 'ACTIVO') {
            balance.assets.total += finalAmount;
            balance.assets.details.push({ name, code, amountHNL: finalAmount, original: numAmount, currency, category });
        } else {
            balance.liabilities.total += finalAmount;
            balance.liabilities.details.push({ name, code, amountHNL: finalAmount, original: numAmount, currency, category });
        }
    };

    // 1. Accounts
    accounts.forEach(acc => {
        processItem(acc.initialBalance, acc.currency, acc.name, acc.type, acc.type === 'ACTIVO' ? 'Activos Líquidos' : 'Pasivos Corrientes', acc.code);
    });

    // 2. Properties
    properties.forEach(prop => {
        processItem(prop.value, prop.currency, prop.name, 'ACTIVO', 'Bienes Inmuebles', prop.code);
    });

    // 3. Loans (Pasivos)
    loans.filter(l => !l.isArchived).forEach(loan => {
        let outstandingBalance = Number(loan.initialAmount);
      
        // Calculate remaining balance based on payment plan
        // Fix: Sort strictly by payment number to get correct last payment
        if (loan.paymentPlan && loan.paymentPlan.length > 0) {
            const paidInstallments = loan.paymentPlan
                .filter(p => p.status === 'PAID')
                .sort((a, b) => a.paymentNumber - b.paymentNumber);
                
            if (paidInstallments.length > 0) {
                // The remaining balance after the last payment
                const lastPayment = paidInstallments[paidInstallments.length - 1];
                outstandingBalance = Number(lastPayment.remainingBalance);
            }
        }
        
        // Ensure we don't process negligble amounts or NaNs
        if (!isNaN(outstandingBalance) && outstandingBalance > 0.01) {
            processItem(outstandingBalance, loan.currency, `Préstamo: ${loan.lenderName}`, 'PASIVO', 'Préstamos Bancarios', loan.loanCode);
        }
    });

    balance.equity = balance.assets.total - balance.liabilities.total;
    return balance;
  };

  // --- CASHFLOW ---
  const calculateCashflow = () => {
    const filtered = transactions.filter(tx => {
      const [y, m] = tx.date.split('-').map(Number);
      return y === selectedYear && (m - 1) === selectedMonth;
    });

    const income = filtered.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'GASTO').reduce((sum, t) => sum + Number(t.amount), 0);
    
    const categories: Record<string, { name: string, type: CategoryType, amount: number }> = {};
    
    filtered.forEach(tx => {
      const catName = tx.categoryName || 'Sin Categoría';
      if (!categories[catName]) categories[catName] = { name: catName, type: tx.type, amount: 0 };
      categories[catName].amount += Number(tx.amount);
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      net: income - expense,
      breakdown: Object.values(categories).sort((a, b) => b.amount - a.amount)
    };
  };

  // --- PROPERTY REPORT ---
  const calculatePropertyReport = () => {
      if (!selectedPropCode) return [];

      const months = Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i,
          monthName: new Date(0, i).toLocaleDateString('es-ES', { month: 'long' }),
          income: 0,
          expense: 0,
          net: 0,
          transactions: [] as Transaction[]
      }));

      transactions.forEach(tx => {
          if (tx.propertyCode !== selectedPropCode) return;
          
          const y = parseInt(tx.date.substring(0, 4));
          const m = parseInt(tx.date.substring(5, 7));
          
          if (y !== selectedYear) return;

          const monthIdx = m - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
              const amount = Number(tx.amount);
              if (tx.type === 'INGRESO') months[monthIdx].income += amount;
              else months[monthIdx].expense += amount;
              
              months[monthIdx].transactions.push(tx);
          }
      });

      months.forEach(m => m.net = m.income - m.expense);
      return months;
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  const balance = calculateConsolidatedBalance();
  const cashflow = calculateCashflow();
  const propertyReport = calculatePropertyReport();
  const selectedPropName = properties.find(p => p.code === selectedPropCode)?.name || 'Seleccionar Propiedad';

  const liquidAssets = balance.assets.details.filter(d => d.category === 'Activos Líquidos');
  const realEstateAssets = balance.assets.details.filter(d => d.category === 'Bienes Inmuebles');
  const loansLiabilities = balance.liabilities.details.filter(d => d.category === 'Préstamos Bancarios');
  const otherLiabilities = balance.liabilities.details.filter(d => d.category !== 'Préstamos Bancarios');

  const totalLoansHNL = loansLiabilities.reduce((sum, item) => sum + item.amountHNL, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reportes Financieros</h1>
        
        <div className="flex gap-4 items-center flex-wrap">
            {activeTab === 'BALANCE' && (
                <div className="flex items-center bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-md border border-slate-600">
                    <span className="text-xs text-slate-300 mr-2 font-medium">Tasa Dólar:</span>
                    <input 
                        type="number" step="0.01"
                        className="w-16 bg-transparent text-right font-mono font-bold outline-none border-b border-slate-500 focus:border-brand-400"
                        value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                    />
                </div>
            )}

            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                <button onClick={() => setActiveTab('BALANCE')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BALANCE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Balance General
                </button>
                <button onClick={() => setActiveTab('CASHFLOW')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'CASHFLOW' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Flujo Mensual
                </button>
                <button onClick={() => setActiveTab('BY_PROPERTY')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BY_PROPERTY' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Por Propiedad
                </button>
            </div>
        </div>
      </div>

      {/* --- BALANCE SHEET TAB --- */}
      {activeTab === 'BALANCE' && (
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden text-slate-100 p-6">
            <h2 className="text-xl font-bold mb-6">Balance General (Consolidado en Lempiras)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: ASSETS */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-indigo-500/50 pb-2">
                        <h3 className="font-bold text-indigo-400 text-lg">Activos (lo que posees)</h3>
                    </div>
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
                     <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Préstamos Bancarios</h4>
                        <div className="space-y-2">
                            {loansLiabilities.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors">
                                    <span className="text-slate-300">{item.name} {item.currency === 'USD' && <span className="text-xs text-emerald-500 ml-1">(USD)</span>}</span>
                                    <span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span>
                                </div>
                            ))}
                            {loansLiabilities.length > 0 && (
                                <div className="flex justify-between text-sm pt-2 mt-2 border-t border-slate-800">
                                    <span className="text-rose-400 font-bold italic">Subtotal Préstamos</span>
                                    <span className="font-mono font-bold text-rose-400">{formatMoney(totalLoansHNL)}</span>
                                </div>
                            )}
                            {loansLiabilities.length === 0 && <p className="text-slate-600 italic text-sm">Sin préstamos activos</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-4">Otras Deudas (Tarjetas, etc.)</h4>
                        <div className="space-y-2">
                            {otherLiabilities.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors">
                                    <span className="text-slate-300">[{item.code}] {item.name} {item.currency === 'USD' && <span className="text-xs text-emerald-500 ml-1">(USD)</span>}</span>
                                    <span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span>
                                </div>
                            ))}
                            {otherLiabilities.length === 0 && <p className="text-slate-600 italic text-sm">Sin otras deudas</p>}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-700 flex justify-between items-end mt-4">
                        <span className="text-slate-400 font-bold">TOTAL PASIVOS</span>
                        <span className="text-2xl font-bold text-rose-400">{formatMoney(balance.liabilities.total)}</span>
                    </div>
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

      {/* --- PROPERTY REPORT TAB --- */}
      {activeTab === 'BY_PROPERTY' && (
        <div className="space-y-6">
             {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-600">
                    <Building size={20} />
                    <span className="font-medium text-sm">Propiedad:</span>
                </div>
                <select 
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    value={selectedPropCode}
                    onChange={(e) => setSelectedPropCode(e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {properties.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2 text-slate-600 ml-4">
                    <Calendar size={20} />
                    <span className="font-medium text-sm">Año:</span>
                </div>
                <select 
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Results Table */}
            {selectedPropCode ? (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50 flex justify-between">
                        <h3 className="font-bold text-indigo-900">Reporte Anual: {selectedPropName}</h3>
                        <span className="font-mono text-indigo-600 font-bold">{selectedYear}</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Mes</th>
                                <th className="px-6 py-3 text-right text-emerald-600">Ingresos</th>
                                <th className="px-6 py-3 text-right text-rose-600">Gastos</th>
                                <th className="px-6 py-3 text-right text-blue-600">Neto</th>
                                <th className="px-6 py-3 text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {propertyReport.map((m) => (
                                <tr key={m.monthIndex} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-700 capitalize">{m.monthName}</td>
                                    <td className="px-6 py-3 text-right font-mono text-emerald-600">{m.income > 0 ? formatMoney(m.income) : '-'}</td>
                                    <td className="px-6 py-3 text-right font-mono text-rose-600">{m.expense > 0 ? formatMoney(m.expense) : '-'}</td>
                                    <td className="px-6 py-3 text-right font-bold font-mono text-slate-800">{formatMoney(m.net)}</td>
                                    <td className="px-6 py-3 text-center">
                                        <button 
                                            onClick={() => setViewingMonthDetails(m)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-20"
                                            disabled={m.transactions.length === 0}
                                            title="Ver Transacciones"
                                        >
                                            <Search size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Footer Totals */}
                            <tr className="bg-slate-50 font-bold">
                                <td className="px-6 py-3 text-slate-700">TOTAL ANUAL</td>
                                <td className="px-6 py-3 text-right text-emerald-700">
                                    {formatMoney(propertyReport.reduce((sum, m) => sum + m.income, 0))}
                                </td>
                                <td className="px-6 py-3 text-right text-rose-700">
                                    {formatMoney(propertyReport.reduce((sum, m) => sum + m.expense, 0))}
                                </td>
                                <td className="px-6 py-3 text-right text-blue-800">
                                    {formatMoney(propertyReport.reduce((sum, m) => sum + m.net, 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                 </div>
            ) : (
                <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <Building size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Selecciona una propiedad para ver el reporte.</p>
                </div>
            )}
        </div>
      )}
      
      <ReportDrilldownModal 
        isOpen={!!viewingMonthDetails}
        onClose={() => setViewingMonthDetails(null)}
        title={viewingMonthDetails ? `Detalle: ${viewingMonthDetails.monthName} ${selectedYear} - ${selectedPropName}` : ''}
        transactions={viewingMonthDetails?.transactions || []}
      />
    </div>
  );
};

export default ReportsPage;
