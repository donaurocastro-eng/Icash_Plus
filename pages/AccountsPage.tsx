
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, CreditCard, Wallet, AlertTriangle, TrendingUp, TrendingDown, Upload, FileSpreadsheet, Download, X, Loader } from 'lucide-react';
import { Account, AccountFormData, AccountType, Currency } from '../types';
import { AccountService } from '../services/accountService';
import AccountModal from '../components/AccountModal';
import * as XLSX from 'xlsx';

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      await AccountService.delete(accountToDelete.code);
      await loadAccounts();
      setAccountToDelete(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsDeleting(false);
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

  const handleDownloadTemplate = () => {
    const headers = ['Nombre', 'Banco', 'Numero', 'Tipo', 'Saldo', 'Moneda'];
    const example = ['Cuenta Ahorros', 'Banco Atlántida', '11223344', 'ACTIVO', 5000, 'HNL'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Cuentas");
    XLSX.writeFile(wb, "plantilla_importar_cuentas.xlsx");
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
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) return;

        for (const row of jsonData as any[]) {
          try {
            const name = row['Nombre'] || row['nombre'] || row['Name'];
            const bank = row['Banco'] || row['banco'] || row['Bank'];
            const number = row['Numero'] || row['numero'] || row['Number'] || 'N/A';
            let typeRaw = (row['Tipo'] || row['tipo'] || 'ACTIVO').toString().toUpperCase().trim();
            const type: AccountType = (typeRaw === 'PASIVO') ? 'PASIVO' : 'ACTIVO';
            let currRaw = (row['Moneda'] || row['moneda'] || 'HNL').toString().toUpperCase().trim();
            const currency: Currency = (currRaw === 'USD') ? 'USD' : 'HNL';
            const balance = parseFloat(row['Saldo'] || row['saldo'] || '0') || 0;

            if (!name || !bank) continue;

            await AccountService.create({
              name: String(name),
              bankName: String(bank),
              accountNumber: String(number),
              type: type,
              initialBalance: balance,
              currency: currency
            });
          } catch (err) { console.error(err); }
        }
        await loadAccounts();
      } catch (error) { console.error(error); } finally { setIsImporting(false); }
    };
    reader.readAsBinaryString(file);
  };

  const formatCurrency = (amount: number, currency: 'HNL' | 'USD') => {
    return new Intl.NumberFormat(currency === 'HNL' ? 'es-HN' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      {accountToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setAccountToDelete(null)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-fadeIn">
                  <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                          {isDeleting ? <Loader size={32} className="animate-spin"/> : <Trash2 size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">¿Eliminar Cuenta?</h3>
                      <p className="text-sm text-slate-600">Vas a eliminar <strong>{accountToDelete.name}</strong>. Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3 w-full pt-2">
                          <button onClick={() => setAccountToDelete(null)} disabled={isDeleting} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                          <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50">Sí, Eliminar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cuentas Bancarias</h1>
          <p className="text-slate-500">Administra tus cuentas, tarjetas y efectivo.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="hidden" />
            <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-md transition-colors text-sm font-medium border-r border-slate-100">
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Plantilla</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50">
              {isImporting ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>
          <button onClick={openNewModal} className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg">
            <Plus size={20} />
            <span className="font-bold">Nueva Cuenta</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar cuenta..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Cuenta</th>
                <th className="px-6 py-4 font-semibold">Banco / Detalle</th>
                <th className="px-6 py-4 font-semibold text-right">Saldo Actual</th>
                <th className="px-6 py-4 font-semibold text-right">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((account) => (
                  <tr key={account.code} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl shadow-sm ${account.isSystem ? 'bg-amber-100 text-amber-600' : 'bg-white border border-slate-100 text-indigo-600'}`}>
                          {account.isSystem ? <Wallet size={20} /> : <CreditCard size={20} />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{account.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{account.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-slate-700 font-medium text-sm block">{account.bankName}</span>
                        <span className="text-slate-400 text-xs font-mono">{account.accountNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-slate-800 text-lg">
                                {formatCurrency(account.currentBalance ?? account.initialBalance, account.currency)}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Calculado</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        {account.type === 'ACTIVO' ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">ACTIVO</span>
                        ) : (
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">PASIVO</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => openEditModal(account)} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                        {!account.isSystem && (
                          <button onClick={() => setAccountToDelete(account)} className="p-2 text-slate-500 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={editingAccount ? handleUpdate : handleCreate} editingAccount={editingAccount} isSubmitting={isSubmitting} />
    </div>
  );
};

export default AccountsPage;
