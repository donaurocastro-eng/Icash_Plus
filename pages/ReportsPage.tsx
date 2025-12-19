
import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Building,
  Search,
  Wallet,
  FileSpreadsheet,
  Loader
} from 'lucide-react';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { PropertyService } from '../services/propertyService';
import { LoanService } from '../services/loanService';
import { Account, Transaction, Property, Loan, CategoryType } from '../types';
import ReportDrilldownModal from '../components/ReportDrilldownModal';
import * as XLSX from 'xlsx';

type ReportTab = 'BALANCE' | 'CASHFLOW' | 'BY_PROPERTY' | 'BY_ACCOUNT';

interface MonthlyStats {
    monthIndex: number;
    monthName: string;
    income: number;
    expense: number;
    net: number;
    transactions: Transaction[];
}

interface AccountMonthlyStats {
    accountCode: string;
    accountName: string;
    currency: string;
    initialBalance: number;
    income: number;
    expense: number;
    transfersIn: number;
    transfersOut: number;
    finalBalance: number;
    transactions: Transaction[];
}

interface ComparativePropertyStats {
    code: string;
    name: string;
    income: number;
    expense: number;
    net: number;
}

interface CashflowCategory {
    name: string;
    type: CategoryType;
    amount: number;
    transactions: Transaction[];
}

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('BALANCE');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
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
  
  // Account Report State (Multi-Select)
  const [selectedAccountCodes, setSelectedAccountCodes] = useState<string[]>([]);

  // Modal State
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

  const toggleAccountSelection = (code: string) => {
      setSelectedAccountCodes(prev => 
          prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      );
  };

  const getTxDateParts = (dateStr: string): { year: number, month: number } | null => {
      if (!dateStr || typeof dateStr !== 'string') return null;
      try {
          const parts = dateStr.split('-');
          if (parts.length < 2) return null;
          return { 
              year: parseInt(parts[0]), 
              month: parseInt(parts[1]) 
          };
      } catch (e) { return null; }
  };

  // --- GLOBAL EXPORT ---
  const handleExportExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      let data: any[] = [];
      let filename = `resumen_${activeTab.toLowerCase()}_${selectedYear}`;

      if (activeTab === 'BALANCE') {
        const b = calculateConsolidatedBalance();
        data = [
          { Seccion: 'ACTIVOS', Detalle: 'TOTAL', Monto_HNL: b.assets.total },
          ...b.assets.details.map(d => ({ Seccion: 'ACTIVO', Detalle: d.name, Monto_Original: d.original, Moneda: d.currency, Monto_HNL: d.amountHNL })),
          { Seccion: 'PASIVOS', Detalle: 'TOTAL', Monto_HNL: b.liabilities.total },
          ...b.liabilities.details.map(d => ({ Seccion: 'PASIVO', Detalle: d.name, Monto_Original: d.original, Moneda: d.currency, Monto_HNL: d.amountHNL })),
          { Seccion: 'PATRIMONIO', Detalle: 'Neto', Monto_HNL: b.equity }
        ];
      } else if (activeTab === 'CASHFLOW') {
        const c = calculateCashflow();
        data = c.breakdown.map(cat => ({ Categoria: cat.name, Tipo: cat.type, Monto: cat.amount }));
      } else if (activeTab === 'BY_PROPERTY') {
        if (selectedPropCode === 'ALL') {
          data = calculateComparativePropertyReport().map(p => ({ Propiedad: p.name, Ingresos: p.income, Gastos: p.expense, Neto: p.net }));
        } else {
          data = calculatePropertyReport().map(m => ({ Mes: m.monthName, Ingresos: m.income, Gastos: m.expense, Neto: m.net }));
        }
      } else if (activeTab === 'BY_ACCOUNT') {
        data = calculateAccountReport().map(r => ({ Cuenta: r.accountName, Saldo_Inicial: r.initialBalance, Ingresos: r.income, Gastos: r.expense, Final: r.finalBalance }));
      }

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  // --- BALANCE SHEET ---
  const calculateConsolidatedBalance = () => {
    const balance = {
      assets: { total: 0, details: [] as any[] },
      liabilities: { total: 0, details: [] as any[] },
      equity: 0
    };

    accounts.forEach(acc => {
        const currentVal = Number(acc.currentBalance || 0);
        let valHNL = currentVal;
        if (acc.currency === 'USD') valHNL = currentVal * exchangeRate;

        if (acc.type === 'ACTIVO') {
            balance.assets.total += valHNL;
            balance.assets.details.push({ name: acc.name, code: acc.code, amountHNL: valHNL, original: currentVal, currency: acc.currency, category: 'Activos Líquidos' });
        } else {
            const debtHNL = -valHNL;
            balance.liabilities.total += debtHNL;
            balance.liabilities.details.push({ name: acc.name, code: acc.code, amountHNL: debtHNL, original: -currentVal, currency: acc.currency, category: 'Pasivos Corrientes' });
        }
    });

    properties.forEach(prop => {
        const valHNL = prop.currency === 'USD' ? Number(prop.value) * exchangeRate : Number(prop.value);
        balance.assets.total += valHNL;
        balance.assets.details.push({ name: prop.name, code: prop.code, amountHNL: valHNL, original: prop.value, currency: prop.currency, category: 'Bienes Inmuebles' });
    });

    loans.filter(l => !l.isArchived).forEach(loan => {
        let outstanding = Number(loan.initialAmount);
        if (loan.paymentPlan) {
            const paid = loan.paymentPlan.filter(p => p.status === 'PAID').sort((a, b) => b.paymentNumber - a.paymentNumber);
            if (paid.length > 0) outstanding = Number(paid[0].remainingBalance);
        }
        const valHNL = loan.currency === 'USD' ? outstanding * exchangeRate : outstanding;
        if (valHNL > 0.01) {
            balance.liabilities.total += valHNL;
            balance.liabilities.details.push({ name: `Préstamo: ${loan.lenderName}`, code: loan.loanCode, amountHNL: valHNL, original: outstanding, currency: loan.currency, category: 'Préstamos' });
        }
    });

    balance.equity = balance.assets.total - balance.liabilities.total;
    return balance;
  };

  // --- CASHFLOW ---
  const calculateCashflow = () => {
    const filtered = transactions.filter(tx => {
      const parts = getTxDateParts(tx.date);
      return parts && parts.year === selectedYear && (parts.month - 1) === selectedMonth;
    });

    const income = filtered.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'GASTO').reduce((sum, t) => sum + Number(t.amount), 0);
    
    const categories: Record<string, CashflowCategory> = {};
    filtered.forEach(tx => {
      const catName = tx.categoryName || 'Sin Categoría';
      if (!categories[catName]) categories[catName] = { name: catName, type: tx.type, amount: 0, transactions: [] };
      categories[catName].amount += Number(tx.amount);
      categories[catName].transactions.push(tx);
    });

    return { totalIncome: income, totalExpense: expense, net: income - expense, breakdown: Object.values(categories).sort((a, b) => b.amount - a.amount) };
  };

  // --- PROPERTY REPORTS ---
  const calculatePropertyReport = () => {
      if (!selectedPropCode || selectedPropCode === 'ALL') return [];
      const months = Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i, monthName: new Date(0, i).toLocaleDateString('es-ES', { month: 'long' }),
          income: 0, expense: 0, net: 0, transactions: [] as Transaction[]
      }));

      transactions.forEach(tx => {
          if (tx.propertyCode !== selectedPropCode) return;
          const parts = getTxDateParts(tx.date);
          if (parts && parts.year === selectedYear) {
              const amount = Number(tx.amount);
              if (tx.type === 'INGRESO') months[parts.month - 1].income += amount;
              else months[parts.month - 1].expense += amount;
              months[parts.month - 1].transactions.push(tx);
          }
      });
      months.forEach(m => m.net = m.income - m.expense);
      return months;
  };

  const calculateComparativePropertyReport = (): ComparativePropertyStats[] => {
      return properties.map(prop => {
          let income = 0; let expense = 0;
          transactions.forEach(tx => {
              const parts = getTxDateParts(tx.date);
              if (tx.propertyCode === prop.code && parts && parts.year === selectedYear && (parts.month - 1) === selectedMonth) {
                   if (tx.type === 'INGRESO') income += Number(tx.amount);
                   else if (tx.type === 'GASTO') expense += Number(tx.amount);
              }
          });
          return { code: prop.code, name: prop.name, income, expense, net: income - expense };
      });
  };

  // --- ACCOUNT REPORT ---
  const calculateAccountReport = () => {
      if (selectedAccountCodes.length === 0) return [];
      const report: AccountMonthlyStats[] = [];

      selectedAccountCodes.forEach(accCode => {
          const acc = accounts.find(a => a.code === accCode);
          if (!acc) return;

          const monthTx = transactions.filter(tx => {
              const parts = getTxDateParts(tx.date);
              const isPeriod = parts && parts.year === selectedYear && (parts.month - 1) === selectedMonth;
              const isSource = tx.accountCode === accCode;
              const isDest = (tx as any).destinationAccountCode === accCode;
              return isPeriod && (isSource || isDest);
          });

          let income = 0; let expense = 0; let transfersOut = 0; let transfersIn = 0;

          monthTx.forEach(tx => {
              const amt = Number(tx.amount);
              if (tx.accountCode === accCode) {
                  if (tx.categoryCode === 'CAT-EXP-013') transfersOut += amt;
                  else if (tx.type === 'INGRESO') income += amt;
                  else if (tx.type === 'GASTO') expense += amt;
              } else if ((tx as any).destinationAccountCode === accCode) {
                  if (tx.categoryCode === 'CAT-INC-007') transfersIn += amt;
              }
          });

          let initialBalance = Number(acc.currentBalance || 0); 
          const startOfSelectMonth = new Date(selectedYear, selectedMonth, 1);
          transactions.forEach(tx => {
              if (new Date(tx.date) >= startOfSelectMonth) {
                  const amt = Number(tx.amount);
                  if (tx.accountCode === accCode) {
                      if (tx.type === 'INGRESO') initialBalance -= amt; 
                      else if (tx.type === 'GASTO') initialBalance += amt; 
                      else if (tx.type === 'TRANSFERENCIA' || tx.categoryCode === 'CAT-EXP-013') initialBalance += amt; 
                  } else if ((tx as any).destinationAccountCode === accCode) {
                      initialBalance -= amt;
                  }
              }
          });

          report.push({
              accountCode: accCode, accountName: acc.name, currency: acc.currency,
              initialBalance, income, expense, transfersIn, transfersOut,
              finalBalance: initialBalance + income - expense - transfersOut + transfersIn,
              transactions: monthTx
          });
      });
      return report;
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  const balance = calculateConsolidatedBalance();
  const cashflow = calculateCashflow();
  const propertyReport = calculatePropertyReport();
  const comparativeReport = calculateComparativePropertyReport();
  const accountReport = calculateAccountReport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reportes Financieros</h1>
        
        <div className="flex gap-4 items-center flex-wrap">
            <button 
                onClick={handleExportExcel}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold disabled:opacity-50"
            >
                {exporting ? <Loader size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                <span>Resumen Excel</span>
            </button>

            {activeTab === 'BALANCE' && (
                <div className="flex items-center bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-md border border-slate-600">
                    <span className="text-xs text-slate-300 mr-2 font-medium">Tasa Dólar:</span>
                    <input type="number" step="0.01" className="w-16 bg-transparent text-right font-mono font-bold outline-none border-b border-slate-500 focus:border-brand-400"
                        value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)} />
                </div>
            )}

            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                <button onClick={() => setActiveTab('BALANCE')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BALANCE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Balance General</button>
                <button onClick={() => setActiveTab('CASHFLOW')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'CASHFLOW' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Flujo Mensual</button>
                <button onClick={() => setActiveTab('BY_PROPERTY')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BY_PROPERTY' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Por Propiedad</button>
                <button onClick={() => setActiveTab('BY_ACCOUNT')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'BY_ACCOUNT' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Por Cuenta</button>
            </div>
        </div>
      </div>

      {activeTab === 'BALANCE' && (
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden text-slate-100 p-6">
            <h2 className="text-xl font-bold mb-6">Balance General (Consolidado en HNL)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-indigo-500/50 pb-2"><h3 className="font-bold text-indigo-400 text-lg">Activos</h3></div>
                    <div>
                        <div className="space-y-2">
                            {balance.assets.details.map((item, i) => (<div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors"><span className="text-slate-300">{item.name} {item.currency === 'USD' && <span className="text-[10px] text-emerald-500 ml-1">(USD)</span>}</span><span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span></div>))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-700 flex justify-between items-end mt-4"><span className="text-slate-400 font-bold">TOTAL ACTIVOS</span><span className="text-2xl font-bold text-emerald-400">{formatMoney(balance.assets.total)}</span></div>
                </div>
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-rose-500/50 pb-2"><h3 className="font-bold text-rose-400 text-lg">Pasivos</h3></div>
                     <div>
                        <div className="space-y-2">
                            {balance.liabilities.details.map((item, i) => (<div key={i} className="flex justify-between text-sm hover:bg-slate-800/50 p-1 rounded transition-colors"><span className="text-slate-300">{item.name} {item.currency === 'USD' && <span className="text-[10px] text-emerald-500 ml-1">(USD)</span>}</span><span className="font-mono text-slate-100">{formatMoney(item.amountHNL)}</span></div>))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-700 flex justify-between items-end mt-4"><span className="text-slate-400 font-bold">TOTAL PASIVOS</span><span className="text-2xl font-bold text-rose-400">{formatMoney(balance.liabilities.total)}</span></div>
                    <div className="mt-12 bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex justify-between items-center"><div><p className="text-slate-400 text-sm uppercase tracking-wider font-bold">Patrimonio Neto</p></div><div className="text-right"><p className="text-3xl font-bold text-white">{formatMoney(balance.equity)}</p></div></div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'CASHFLOW' && (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                    {Array.from({length: 12}, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleDateString('es-ES', {month: 'long'}).toUpperCase()}</option>))}
                </select>
                <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100"><p className="text-emerald-600 font-medium text-xs mb-1">Ingresos</p><p className="text-2xl font-bold text-emerald-800">{formatMoney(cashflow.totalIncome)}</p></div>
                <div className="bg-rose-50 p-5 rounded-xl border border-rose-100"><p className="text-rose-600 font-medium text-xs mb-1">Gastos</p><p className="text-2xl font-bold text-rose-800">{formatMoney(cashflow.totalExpense)}</p></div>
                <div className={`p-5 rounded-xl border ${cashflow.net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}><p className={`font-medium text-xs mb-1 ${cashflow.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Neto</p><p className={`text-2xl font-bold ${cashflow.net >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatMoney(cashflow.net)}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr><th className="px-6 py-3">Categoría</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-center">Lupa</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cashflow.breakdown.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-medium text-slate-700">{cat.name}</td>
                                <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${cat.type === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{cat.type}</span></td>
                                <td className="px-6 py-3 text-right font-bold text-slate-700">{formatMoney(cat.amount)}</td>
                                <td className="px-6 py-3 text-center"><button onClick={() => setViewingMonthDetails({monthIndex: selectedMonth, monthName: cat.name, income:0, expense:0, net:0, transactions: cat.transactions})} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Search size={16}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'BY_PROPERTY' && (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedPropCode} onChange={(e) => setSelectedPropCode(e.target.value)}>
                    <option value="">Seleccionar Propiedad...</option>
                    <option value="ALL">TODAS (Comparativo)</option>
                    {properties.map(p => (<option key={p.code} value={p.code}>{p.name}</option>))}
                </select>
                <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
            
            {selectedPropCode && selectedPropCode !== 'ALL' && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Mes</th><th className="px-6 py-3 text-right">Ingresos</th><th className="px-6 py-3 text-right">Gastos</th><th className="px-6 py-3 text-right">Neto</th><th className="px-6 py-3 text-center">Lupa</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {calculatePropertyReport().map((m) => (<tr key={m.monthIndex} className="hover:bg-slate-50"><td className="px-6 py-3 font-medium text-slate-700 capitalize">{m.monthName}</td><td className="px-6 py-3 text-right font-mono text-emerald-600">{formatMoney(m.income)}</td><td className="px-6 py-3 text-right font-mono text-rose-600">{formatMoney(m.expense)}</td><td className="px-6 py-3 text-right font-bold">{formatMoney(m.net)}</td><td className="px-6 py-3 text-center"><button onClick={() => setViewingMonthDetails(m)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Search size={16}/></button></td></tr>))}
                        </tbody>
                    </table>
                 </div>
            )}

            {selectedPropCode === 'ALL' && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Propiedad</th><th className="px-6 py-3 text-right">Ingresos</th><th className="px-6 py-3 text-right">Gastos</th><th className="px-6 py-3 text-right">Neto</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {comparativeReport.map((p) => (<tr key={p.code} className="hover:bg-slate-50"><td className="px-6 py-3 font-medium text-slate-700">{p.name}</td><td className="px-6 py-3 text-right">{formatMoney(p.income)}</td><td className="px-6 py-3 text-right">{formatMoney(p.expense)}</td><td className="px-6 py-3 text-right font-bold">{formatMoney(p.net)}</td></tr>))}
                        </tbody>
                    </table>
                 </div>
            )}
        </div>
      )}

      {activeTab === 'BY_ACCOUNT' && (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex gap-4"><select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>{Array.from({length: 12}, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleDateString('es-ES', {month: 'long'}).toUpperCase()}</option>))}</select><select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {accounts.map(acc => (<button key={acc.code} onClick={() => toggleAccountSelection(acc.code)} className={`px-3 py-2 rounded border text-[10px] font-bold uppercase transition-colors ${selectedAccountCodes.includes(acc.code) ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200'}`}>{acc.name}</button>))}
                </div>
            </div>

            {selectedAccountCodes.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider"><tr><th className="px-4 py-3">Cuenta</th><th className="px-4 py-3 text-right">Inicial</th><th className="px-4 py-3 text-right text-emerald-600">Ingresos</th><th className="px-4 py-3 text-right text-rose-600">Gastos</th><th className="px-4 py-3 text-right font-bold">Final</th><th className="px-4 py-3 text-center">Auditoría</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {accountReport.map(row => (
                                <tr key={row.accountCode} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-800">{row.accountName} <span className="text-[9px] text-slate-400 font-mono">({row.currency})</span></td>
                                    <td className="px-4 py-3 text-right font-mono">{formatMoney(row.initialBalance, row.currency as any)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{formatMoney(row.income, row.currency as any)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-rose-600">{formatMoney(row.expense, row.currency as any)}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono bg-slate-50/50">{formatMoney(row.finalBalance, row.currency as any)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => setViewingMonthDetails({monthIndex: selectedMonth, monthName: `${row.accountName} - ${new Date(0, selectedMonth).toLocaleDateString('es-ES', {month: 'long'})}`, income:0, expense:0, net:0, transactions: row.transactions})} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Search size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}
      
      <ReportDrilldownModal isOpen={!!viewingMonthDetails} onClose={() => setViewingMonthDetails(null)} title={viewingMonthDetails ? viewingMonthDetails.monthName : ''} transactions={viewingMonthDetails?.transactions || []} />
    </div>
  );
};

export default ReportsPage;
