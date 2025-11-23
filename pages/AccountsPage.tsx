import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, CreditCard, Wallet, AlertTriangle, TrendingUp, TrendingDown, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { Account, AccountFormData, AccountType, Currency } from '../types';
import { AccountService } from '../services/accountService';
import AccountModal from '../components/AccountModal';
import * as XLSX from 'xlsx';

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- EXCEL LOGIC ---

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
        
        if (jsonData.length === 0) {
          alert("El archivo parece estar vacío.");
          return;
        }

        let successCount = 0;
        let errorCount = 0;

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

            if (!name || !bank) {
              errorCount++;
              continue;
            }

            const accountData: AccountFormData = {
              name: String(name),
              bankName: String(bank),
              accountNumber: String(number),
              type: type,
              initialBalance: balance,
              currency: currency
            };

            await AccountService.create(accountData);
            successCount++;

          } catch (err) {
            console.error("Error importing row:", row, err);
            errorCount++;
          }
        }

        await loadAccounts();
        alert(`Importación completada.\n✅ Exitosos: ${successCount}\n❌ Fallidos: ${errorCount}`);

      } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Error al leer el archivo Excel.");
      } finally {
        setIsImporting(false);
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cuentas Bancarias</h1>
          <p className="text-slate-500">Administra tus cuentas, tarjetas y efectivo.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Excel Actions Group */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-md transition-colors text-sm font-medium border-r border-slate-100"
              title="Descargar Plantilla Excel"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Plantilla</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              title="Subir archivo Excel"
            >
              {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full"/> : <Upload size={16} />}
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

          <button 
            onClick={openNewModal}
            className="flex items-center justify-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold">Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar cuenta..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Cuenta</th>
                <th className="px-6 py-4 font-semibold">Banco / Detalle</th>
                <th className="px-6 py-4 font-semibold text-right">Saldo Inicial</th>
                <th className="px-6 py-4 font-semibold text-right">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-slate-50 p-4 rounded-full">
                        <Search size={32} className="opacity-20" />
                      </div>
                      <p>No se encontraron cuentas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.code} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl shadow-sm ${account.isSystem ? 'bg-amber-100 text-amber-600' : 'bg-white border border-slate-100 text-brand-600'}`}>
                          {account.isSystem ? <Wallet size={20} /> : <CreditCard size={20} />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{account.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{account.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-medium text-sm">{account.bankName}</span>
                        <span className="text-slate-400 text-xs font-mono mt-0.5">{account.accountNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${
                         account.currency === 'HNL' 
                           ? 'bg-indigo-50 text-indigo-700' 
                           : 'bg-emerald-50 text-emerald-700'
                       }`}>
                         {formatCurrency(account.initialBalance, account.currency)}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        {account.type === 'ACTIVO' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100/50 text-emerald-700 border border-emerald-100">
                              <TrendingUp size={10} />
                              <span>ACTIVO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-100/50 text-rose-700 border border-rose-100">
                              <TrendingDown size={10} />
                              <span>PASIVO</span>
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(account)}
                          className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        
                        {!account.isSystem && (
                          <button 
                            onClick={() => handleDelete(account.code)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
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