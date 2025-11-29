
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Users,
  Database,
  Landmark
} from 'lucide-react';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { PropertyService } from '../services/propertyService';
import { ContractService } from '../services/contractService';
import { LoanService } from '../services/loanService';
import { Account, Transaction, Property, Contract, Loan } from '../types';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  const [schemaError, setSchemaError] = useState<string | null>(null);
  
  // Tasa de cambio para visualización consolidada (referencial)
  const EXCHANGE_RATE = 25.00;

  useEffect(() => {
    const loadData = async () => {
      try {
        setSchemaError(null);
        const [accData, txData, propData, contData, loanData] = await Promise.all([
          AccountService.getAll(),
          TransactionService.getAll(),
          PropertyService.getAll(),
          ContractService.getAll(),
          LoanService.getAll()
        ]);
        setAccounts(accData);
        setTransactions(txData);
        setProperties(propData);
        setContracts(contData);
        setLoans(loanData);
      } catch (error: any) {
        console.error("Error loading dashboard data", error);
        const msg = error.message || '';
        if (msg.includes('does not exist') || msg.includes('initial_balance')) {
            setSchemaError(msg);
        }
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

  if (schemaError) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-4">
                <Database size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Actualización Requerida</h2>
            <p className="text-slate-600">Tu base de datos necesita mantenimiento.</p>
            <div className="pt-2">
                <div className="flex flex-col gap-2 text-sm text-indigo-700 bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-left">
                    <p>Ve a <strong>Configuración</strong> &gt; <strong>Inicializar / Reparar Tablas</strong>.</p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- CALCULATIONS ---

  const totals = {
    hnl: { assets: 0, liabilities: 0, realEstate: 0, loans: 0 },
    usd: { assets: 0, liabilities: 0, realEstate: 0, loans: 0 }
  };

  // 1. Accounts
  accounts.forEach(acc => {
    const target = acc.currency === 'HNL' ? totals.hnl : totals.usd;
    const balance = Number(acc.initialBalance);
    if (acc.type === 'ACTIVO') {
        target.assets += balance;
    } else {
        // PASIVO: Sum Absolute Value (Magnitude of Debt)
        target.liabilities += Math.abs(balance);
    }
  });

  // 2. Properties (Assets)
  properties.forEach(prop => {
    const target = prop.currency === 'HNL' ? totals.hnl : totals.usd;
    const value = Number(prop.value);
    target.realEstate += value;
    target.assets += value;
  });

  // 3. Loans (Liabilities)
  const activeLoans = loans.filter(l => !l.isArchived);
  activeLoans.forEach(loan => {
      const target = loan.currency === 'HNL' ? totals.hnl : totals.usd;
      let outstandingBalance = Number(loan.initialAmount);
      
      // Calculate remaining balance based on payment plan
      if (loan.paymentPlan && loan.paymentPlan.length > 0) {
          // Sort strictly by paymentNumber to ensure correct order
          const paidInstallments = loan.paymentPlan
            .filter(p => p.status === 'PAID')
            .sort((a, b) => a.paymentNumber - b.paymentNumber);
            
          if (paidInstallments.length > 0) {
              // The remaining balance after the last paid installment is the current debt
              const lastPayment = paidInstallments[paidInstallments.length - 1];
              outstandingBalance = Number(lastPayment.remainingBalance);
          }
      }
      
      // Ensure positive magnitude for debt summation
      const debtAmount = Math.abs(outstandingBalance);
      target.liabilities += debtAmount;
      target.loans += debtAmount;
  });

  // --- CONSOLIDATED CALCULATIONS (Base HNL) ---
  const consolidatedAssetsHNL = totals.hnl.assets + (totals.usd.assets * EXCHANGE_RATE);
  const consolidatedLiabilitiesHNL = totals.hnl.liabilities + (totals.usd.liabilities * EXCHANGE_RATE);
  // Net Worth = Assets - Liabilities (since Liabilities are now positive magnitudes)
  const consolidatedNetWorthHNL = consolidatedAssetsHNL - consolidatedLiabilitiesHNL;

  // --- CASHFLOW ---
  const now = new Date();
  const currentMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyIncome = currentMonthTx.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + Number(t.amount), 0); 
  const monthlyExpense = currentMonthTx.filter(t => t.type === 'GASTO').reduce((sum, t) => sum + Number(t.amount), 0);

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
  const projectedRent = activeContracts.reduce((sum, c) => sum + Number(c.amount), 0);

  // --- FORMATTERS ---
  const formatHNL = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);
  const formatUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel Financiero</h1>
        <p className="text-slate-500">Resumen de tu situación patrimonial.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CONSOLIDATED NET WORTH (HNL) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} className="text-indigo-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Patrimonio Neto (Consolidado)</p>
          <h3 className="text-2xl font-bold text-indigo-900 mt-1">
            {formatHNL(consolidatedNetWorthHNL)}
          </h3>
          <div className="mt-2 text-xs text-slate-400 flex flex-col gap-0.5">
            <span>Activos Totales: <span className="text-emerald-600 font-medium">{formatHNL(consolidatedAssetsHNL)}</span></span>
            <span>Pasivos Totales: <span className="text-red-500 font-medium">{formatHNL(consolidatedLiabilitiesHNL)}</span></span>
          </div>
        </div>

        {/* USD Net Worth (Pure USD) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={48} className="text-emerald-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Patrimonio Neto (Solo USD)</p>
          <h3 className="text-2xl font-bold text-emerald-900 mt-1">
            {formatUSD(totals.usd.assets - totals.usd.liabilities)}
          </h3>
          <div className="mt-2 text-xs text-slate-400 flex flex-col gap-0.5">
            <span>Activos: <span className="text-emerald-600 font-medium">{formatUSD(totals.usd.assets)}</span></span>
            <span>Pasivos: <span className="text-red-500 font-medium">{formatUSD(totals.usd.liabilities)}</span></span>
          </div>
        </div>

        {/* Loans / Debt Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <Landmark size={48} className="text-rose-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Deuda Total (Préstamos)</p>
          <div className="flex flex-col mt-1">
             <h3 className="text-2xl font-bold text-rose-700">
              {formatHNL(totals.hnl.loans)}
            </h3>
            {totals.usd.loans > 0 && (
                <span className="text-sm font-bold text-rose-500"> + {formatUSD(totals.usd.loans)}</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
             {activeLoans.length} préstamos activos
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
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
                        {tx.type === 'INGRESO' ? '+' : '-'}{formatHNL(Number(tx.amount))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Alquileres</h3>
              <p className="text-xs text-slate-500">Resumen</p>
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
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Valor Inmuebles</span>
              <span className="font-bold text-slate-700">{formatHNL(totals.hnl.realEstate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
