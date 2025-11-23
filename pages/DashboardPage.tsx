
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Wallet, 
  ArrowRight,
  CreditCard,
  Users
} from 'lucide-react';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { PropertyService } from '../services/propertyService';
import { ContractService } from '../services/contractService';
import { Account, Transaction, Property, Contract } from '../types';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accData, txData, propData, contData] = await Promise.all([
          AccountService.getAll(),
          TransactionService.getAll(),
          PropertyService.getAll(),
          ContractService.getAll()
        ]);
        setAccounts(accData);
        setTransactions(txData);
        setProperties(propData);
        setContracts(contData);
      } catch (error) {
        console.error("Error loading dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // --- CALCULATIONS ---

  // 1. Assets & Liabilities (Separated by Currency)
  const totals = {
    hnl: { assets: 0, liabilities: 0, realEstate: 0 },
    usd: { assets: 0, liabilities: 0, realEstate: 0 }
  };

  accounts.forEach(acc => {
    const target = acc.currency === 'HNL' ? totals.hnl : totals.usd;
    if (acc.type === 'ACTIVO') target.assets += acc.initialBalance;
    else target.liabilities += acc.initialBalance;
  });

  properties.forEach(prop => {
    const target = prop.currency === 'HNL' ? totals.hnl : totals.usd;
    target.realEstate += prop.value;
    target.assets += prop.value; // Real Estate is an Asset
  });

  // 2. Monthly Cashflow (Current Month)
  const now = new Date();
  const currentMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyIncome = currentMonthTx
    .filter(t => t.type === 'INGRESO')
    .reduce((sum, t) => sum + t.amount, 0); // Note: Assuming mixed currency summation for simplicity in chart, or dominated by HNL
  
  const monthlyExpense = currentMonthTx
    .filter(t => t.type === 'GASTO')
    .reduce((sum, t) => sum + t.amount, 0);

  // 3. Rental Income Projection
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
  const projectedRent = activeContracts.reduce((sum, c) => sum + c.amount, 0);

  // --- FORMATTERS ---
  const formatHNL = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(n);
  const formatUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel Financiero</h1>
        <p className="text-slate-500">Resumen de tu situación patrimonial.</p>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HNL Net Worth */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} className="text-indigo-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Patrimonio Neto (HNL)</p>
          <h3 className="text-2xl font-bold text-indigo-900 mt-1">
            {formatHNL(totals.hnl.assets - totals.hnl.liabilities)}
          </h3>
          <div className="mt-2 text-xs text-slate-400 flex flex-col">
            <span>Activos: <span className="text-emerald-600 font-medium">{formatHNL(totals.hnl.assets)}</span></span>
            <span>Pasivos: <span className="text-red-500 font-medium">{formatHNL(totals.hnl.liabilities)}</span></span>
          </div>
        </div>

        {/* USD Net Worth */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={48} className="text-emerald-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Patrimonio Neto (USD)</p>
          <h3 className="text-2xl font-bold text-emerald-900 mt-1">
            {formatUSD(totals.usd.assets - totals.usd.liabilities)}
          </h3>
          <div className="mt-2 text-xs text-slate-400 flex flex-col">
            <span>Activos: <span className="text-emerald-600 font-medium">{formatUSD(totals.usd.assets)}</span></span>
            <span>Pasivos: <span className="text-red-500 font-medium">{formatUSD(totals.usd.liabilities)}</span></span>
          </div>
        </div>

        {/* Monthly Cashflow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={48} className="text-brand-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Flujo de Caja (Este Mes)</p>
          <div className="flex items-end space-x-2 mt-1">
             <h3 className={`text-2xl font-bold ${monthlyIncome - monthlyExpense >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
              {formatHNL(monthlyIncome - monthlyExpense)}
            </h3>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex items-center justify-center">
              <TrendingUp size={12} className="mr-1" />
              {formatHNL(monthlyIncome)}
            </div>
             <div className="bg-rose-50 text-rose-700 px-2 py-1 rounded flex items-center justify-center">
              <TrendingDown size={12} className="mr-1" />
              {formatHNL(monthlyExpense)}
            </div>
          </div>
        </div>

        {/* Real Estate Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building size={48} className="text-orange-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Bienes Raíces</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">
            {properties.length} <span className="text-sm font-normal text-slate-400">Propiedades</span>
          </h3>
           <div className="mt-2 text-xs text-slate-500">
             Valor Estimado: <span className="font-semibold text-slate-700">{formatHNL(totals.hnl.realEstate)}</span>
             {totals.usd.realEstate > 0 && <span> + {formatUSD(totals.usd.realEstate)}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- RECENT TRANSACTIONS --- */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Actividad Reciente</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Detalle</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 5).map(tx => (
                  <tr key={tx.code} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{tx.description}</span>
                        <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {tx.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      <span className={tx.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}>
                        {tx.type === 'INGRESO' ? '+' : '-'}{formatHNL(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                      No hay movimientos recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- RENTAL SUMMARY --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Alquileres</h3>
              <p className="text-xs text-slate-500">Resumen de Contratos</p>
            </div>
          </div>
          
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Contratos Activos</span>
              <span className="font-bold text-slate-800">{activeContracts.length}</span>
            </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Proyección Mensual</span>
              <span className="font-bold text-emerald-600">{formatHNL(projectedRent)}</span>
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Próximos Vencimientos</h4>
              <ul className="space-y-2">
                {contracts.filter(c => c.status === 'ACTIVE').slice(0,3).map(c => (
                  <li key={c.code} className="text-xs flex justify-between text-slate-600">
                    <span>{c.code}</span>
                    <span className="text-slate-400">{new Date(c.endDate).toLocaleDateString()}</span>
                  </li>
                ))}
                {activeContracts.length === 0 && (
                   <li className="text-xs text-slate-400 italic">No hay contratos activos</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* --- QUICK ACCOUNTS --- */}
      <div>
        <h3 className="font-bold text-slate-800 mb-4">Mis Cuentas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {accounts.slice(0, 6).map(acc => (
             <div key={acc.code} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3">
                   <div className={`p-2 rounded-lg ${acc.isSystem ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                     {acc.isSystem ? <Wallet size={18} /> : <CreditCard size={18} />}
                   </div>
                   <div>
                     <p className="font-medium text-slate-800 text-sm truncate max-w-[120px]">{acc.name}</p>
                     <p className="text-xs text-slate-400">{acc.bankName}</p>
                   </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${acc.currency === 'HNL' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                    {acc.currency === 'HNL' ? formatHNL(acc.initialBalance) : formatUSD(acc.initialBalance)}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${acc.type === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {acc.type}
                  </span>
                </div>
             </div>
           ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
