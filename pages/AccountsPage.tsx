import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, CreditCard, Wallet, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Account, AccountFormData } from '../types';
import { AccountService } from '../services/accountService';
import AccountModal from '../components/AccountModal';

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadAccounts = async () => {
    try {
      const data = await AccountService.getAll();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Handlers
  const handleCreate = async (data: AccountFormData) => {
    setIsSubmitting(true);
    try {
      await AccountService.create(data);
      await loadAccounts();
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: AccountFormData) => {
    if (!editingAccount) return;
    setIsSubmitting(true);
    try {
      await AccountService.update(editingAccount.code, data);
      await loadAccounts();
      setIsModalOpen(false);
      setEditingAccount(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar la cuenta ${code}?`)) return;
    
    try {
      await AccountService.delete(code);
      await loadAccounts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openNewModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  // Filtering
  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cuentas</h1>
          <p className="text-slate-500">Gestiona tus cuentas bancarias y efectivo.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center justify-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={20} />
          <span className="font-medium">Nueva Cuenta</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nombre, banco o código..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Cuenta</th>
                <th className="px-6 py-4 font-semibold">Banco</th>
                <th className="px-6 py-4 font-semibold">Número</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search size={32} className="opacity-20" />
                      <p>No se encontraron cuentas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.code} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        account.isSystem 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {account.code}
                      </span>
                    </td>
                     <td className="px-6 py-4">
                      {account.type === 'ACTIVO' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          <TrendingUp size={12} />
                          <span>ACTIVO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full">
                          <TrendingDown size={12} />
                          <span>PASIVO</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${account.isSystem ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600'}`}>
                          {account.isSystem ? <Wallet size={18} /> : <CreditCard size={18} />}
                        </div>
                        <span className="font-medium text-slate-800">{account.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{account.bankName}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{account.accountNumber}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openEditModal(account)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        
                        {!account.isSystem && (
                          <button 
                            onClick={() => handleDelete(account.code)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {account.isSystem && (
                          <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Sistema">
                            <AlertTriangle size={16} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AccountModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={editingAccount ? handleUpdate : handleCreate}
        editingAccount={editingAccount}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AccountsPage;