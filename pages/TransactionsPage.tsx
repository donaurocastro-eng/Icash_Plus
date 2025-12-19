
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, ArrowDownCircle, ArrowUpCircle, Calendar, ArrowRightLeft, Edit2, FileSpreadsheet, Upload, Filter, Loader, X, AlertTriangle, CheckCircle, Download, Info, Wallet } from 'lucide-react';
import { Transaction, TransactionFormData, Account, Category, Property, PropertyServiceItem, Loan } from '../types';
import { TransactionService } from '../services/transactionService';
import { AccountService } from '../services/accountService';
import { CategoryService } from '../services/categoryService';
import { PropertyService } from '../services/propertyService';
import { ServiceItemService } from '../services/serviceItemService';
import { LoanService } from '../services/loanService';
import TransactionModal from '../components/TransactionModal';
import * as XLSX from 'xlsx';

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helpers for Excel Reference Sheets
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [services, setServices] = useState<PropertyServiceItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccountType, setSelectedAccountType] = useState<'ALL' | 'ACTIVO' | 'PASIVO'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Import/Export Status
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [isExporting, setIsExporting] = useState(false);
  
  // Custom UI State
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTransactions = async () => {
    try {
      const [txData, accData, catData, propData, servData, loanData] = await Promise.all([
          TransactionService.getAll(),
          AccountService.getAll(),
          CategoryService.getAll(),
          PropertyService.getAll(),
          ServiceItemService.getAll(),
          LoanService.getAll()
      ]);
      setTransactions(txData);
      setAccounts(accData);
      setCategories(catData);
      setProperties(propData);
      setServices(servData);
      setLoans(loanData);
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
      setNotification({ type: 'success', message: 'Transacción creada correctamente' });
    } catch (error: any) {
        setNotification({ type: 'error', message: error.message });
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
          setNotification({ type: 'success', message: 'Transacción actualizada' });
      } catch (e: any) {
          setNotification({ type: 'error', message: e.message });
      } finally {
          setIsSubmitting(false);
      }
  };

  const requestDelete = (tx: Transaction) => {
      setTransactionToDelete(tx);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    setDeletingId(transactionToDelete.code);
    try {
      await TransactionService.delete(transactionToDelete.code);
      await loadTransactions();
      setNotification({ type: 'success', message: 'Registro eliminado correctamente.' });
      setTransactionToDelete(null);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Error al eliminar: ${error.message}` });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'Fecha (YYYY-MM-DD)', 
      'Descripcion', 
      'Monto', 
      'Tipo (GASTO/INGRESO/TRANSFERENCIA)', 
      'Cod_Categoria', 
      'Cod_Cuenta_Origen', 
      'Cod_Cuenta_Destino (Solo Transf)', 
      'Cod_Propiedad (Opcional)', 
      'Cod_Inquilino (Opcional)',
      'Cod_Contrato (Opcional)',
      'Cod_Servicio (Opcional)',
      'Periodo_Facturable (YYYY-MM)',
      'Cod_Prestamo (Opcional)',
      'No_Cuota (Opcional)'
    ];
    const helpRow = [
      'Ej: 2024-03-20', 'Pago Alquiler - Juan Perez', '8500.50', 'INGRESO', 'CAT-INC-003', 'CTA-001', 'N/A', 'AP-001', 'INQ-001', 'CTR-001', 'N/A', '2024-03', 'N/A', 'N/A'
    ];
    const wsMain = XLSX.utils.aoa_to_sheet([headers, helpRow]);
    wsMain['!cols'] = headers.map(h => ({ wch: h.length + 5 }));
    XLSX.utils.book_append_sheet(wb, wsMain, "Importar_Movimientos");

    const accHeaders = ['Codigo', 'Nombre', 'Banco', 'Moneda', 'Tipo'];
    const accData = accounts.map(a => [a.code, a.name, a.bankName, a.currency, a.type]);
    const wsAcc = XLSX.utils.aoa_to_sheet([accHeaders, ...accData]);
    XLSX.utils.book_append_sheet(wb, wsAcc, "REF_CUENTAS");

    const catHeaders = ['Codigo', 'Nombre', 'Tipo'];
    const catData = categories.map(c => [c.code, c.name, c.type]);
    const wsCat = XLSX.utils.aoa_to_sheet([catHeaders, ...catData]);
    XLSX.utils.book_append_sheet(wb, wsCat, "REF_CATEGORIAS");

    const propHeaders = ['Codigo', 'Nombre'];
    const propData = properties.map(p => [p.code, p.name]);
    const wsProp = XLSX.utils.aoa_to_sheet([propHeaders, ...propData]);
    XLSX.utils.book_append_sheet(wb, wsProp, "REF_PROPIEDADES");

    const servHeaders = ['Codigo', 'Nombre', 'Cod_Propiedad'];
    const servData = services.map(s => [s.code, s.name, s.propertyCode]);
    const wsServ = XLSX.utils.aoa_to_sheet([servHeaders, ...servData]);
    XLSX.utils.book_append_sheet(wb, wsServ, "REF_SERVICIOS");

    const loanHeaders = ['Codigo', 'Acreedor', 'Monto_Original'];
    const loanData = loans.map(l => [l.loanCode, l.lenderName, l.initialAmount]);
    const wsLoan = XLSX.utils.aoa_to_sheet([loanHeaders, ...loanData]);
    XLSX.utils.book_append_sheet(wb, wsLoan, "REF_PRESTAMOS");

    XLSX.writeFile(wb, "plantilla_maestra_transacciones.xlsx");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const processExcelFile = async (file: File) => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: 0, status: 'Iniciando lectura de archivo...' });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];
        
        const rowsToProcess = json.filter(row => {
            const firstVal = String(Object.values(row)[0]);
            return !firstVal.startsWith('Ej:');
        });

        if (rowsToProcess.length === 0) { 
            setNotification({ type: 'error', message: "El archivo no contiene datos válidos." });
            setIsImporting(false);
            return; 
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rowsToProcess.length; i++) {
            const row = rowsToProcess[i];
            const rowNum = i + 1;
            try {
                setImportProgress({ current: rowNum, total: rowsToProcess.length, status: `Procesando fila ${rowNum}: ${row['Descripcion'] || '...'}...` });

                const txData: TransactionFormData = {
                    date: String(row['Fecha (YYYY-MM-DD)'] || '').trim(),
                    description: String(row['Descripcion'] || '').trim(),
                    amount: parseFloat(row['Monto']) || 0,
                    type: (String(row['Tipo (GASTO/INGRESO/TRANSFERENCIA)'] || '').toUpperCase().trim()) as any,
                    categoryCode: String(row['Cod_Categoria'] || '').trim(),
                    accountCode: String(row['Cod_Cuenta_Origen'] || '').trim(),
                    destinationAccountCode: row['Cod_Cuenta_Destino (Solo Transf)'] !== 'N/A' ? String(row['Cod_Cuenta_Destino (Solo Transf)'] || '').trim() : undefined,
                    propertyCode: row['Cod_Propiedad (Opcional)'] !== 'N/A' ? String(row['Cod_Propiedad (Opcional)'] || '').trim() : undefined,
                    tenantCode: row['Cod_Inquilino (Opcional)'] !== 'N/A' ? String(row['Cod_Inquilino (Opcional)'] || '').trim() : undefined,
                    contractCode: row['Cod_Contrato (Opcional)'] !== 'N/A' ? String(row['Cod_Contrato (Opcional)'] || '').trim() : undefined,
                    serviceCode: row['Cod_Servicio (Opcional)'] !== 'N/A' ? String(row['Cod_Servicio (Opcional)'] || '').trim() : undefined,
                    billablePeriod: row['Periodo_Facturable (YYYY-MM)'] !== 'N/A' ? String(row['Periodo_Facturable (YYYY-MM)'] || '').trim() : undefined,
                    loanCode: row['Cod_Prestamo (Opcional)'] !== 'N/A' ? String(row['Cod_Prestamo (Opcional)'] || '').trim() : undefined,
                    paymentNumber: row['No_Cuota (Opcional)'] !== 'N/A' ? parseInt(row['No_Cuota (Opcional)']) : undefined
                };

                if (!txData.date || !txData.amount || !txData.accountCode) throw new Error("Faltan campos obligatorios.");
                await TransactionService.create(txData);
                successCount++;
            } catch (err) { errorCount++; }
        }
        
        await loadTransactions();
        setNotification({ type: 'success', message: `Importación finalizada. ✅ Éxito: ${successCount} | ❌ Error: ${errorCount}` });
      } catch (err) { setNotification({ type: 'error', message: "Error al leer el archivo Excel." }); }
      finally { setIsImporting(false); setImportProgress({ current: 0, total: 0, status: '' }); }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
        const dataToExport = filteredTransactions.map(t => ({
            'Código': t.code,
            'Fecha': formatDate(t.date),
            'Descripción': t.description,
            'Monto': t.amount,
            'Tipo': t.type,
            'Categoría': t.categoryName,
            'Cuenta': t.accountName,
            'Propiedad': t.propertyName || 'N/A',
            'Inquilino': t.tenantName || 'N/A',
            'Servicio': t.serviceCode || 'N/A',
            'Periodo': t.billablePeriod || 'N/A'
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
        XLSX.writeFile(wb, `movimientos_${selectedYear}_${selectedMonth + 1}.xlsx`);
        setNotification({ type: 'success', message: 'Reporte Excel generado.' });
    } catch (e) { setNotification({ type: 'error', message: 'Error al exportar.' }); }
    finally { setIsExporting(false); }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const parts = isoString.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isoString;
    } catch(e) { return isoString; }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amount);
  };

  // --- LÓGICA DE FILTRADO ACTUALIZADA ---
  const filteredTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const parts = t.date.split('-');
    if (parts.length < 2) return false;
    
    // Filtro Fecha
    const tYear = parseInt(parts[0]);
    const tMonth = parseInt(parts[1]) - 1;
    const matchesDate = tYear === selectedYear && tMonth === selectedMonth;
    
    // Filtro Búsqueda
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro Tipo de Cuenta (ACTIVO/PASIVO)
    let matchesAccountType = true;
    if (selectedAccountType !== 'ALL') {
        const acc = accounts.find(a => a.code === t.accountCode);
        matchesAccountType = acc ? acc.type === selectedAccountType : false;
    }

    return matchesDate && matchesSearch && matchesAccountType;
  });

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6 relative">
      {/* NOTIFICATION */}
      {notification && (
          <div className={`fixed top-4 right-4 z-[100] max-w-sm w-full p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-slideIn ${
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
              notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
              {notification.type === 'success' ? <CheckCircle size={20} className="text-emerald-500 shrink-0"/> : 
               notification.type === 'error' ? <AlertTriangle size={20} className="text-rose-500 shrink-0"/> : <Info size={20} className="text-blue-500 shrink-0"/>}
              <div className="flex-1 text-sm font-medium">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
      )}

      {/* IMPORT PROGRESS OVERLAY */}
      {isImporting && (
          <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6 text-center animate-fadeIn">
                  <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600">
                          {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xl font-black text-slate-800">Procesando Importación</h3>
                      <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{importProgress.status}</p>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-300" 
                        style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                      />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando registros...</p>
              </div>
          </div>
      )}

      {/* DELETE CONFIRMATION */}
      {transactionToDelete && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !deletingId && setTransactionToDelete(null)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-fadeIn">
                  <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                          {deletingId ? <Loader size={32} className="animate-spin"/> : <Trash2 size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">¿Eliminar Transacción?</h3>
                      <p className="text-sm text-slate-600">Eliminarás el registro: <strong>{transactionToDelete.description}</strong></p>
                      <div className="flex gap-3 w-full pt-2">
                          <button onClick={() => setTransactionToDelete(null)} disabled={!!deletingId} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold">Cancelar</button>
                          <button onClick={confirmDelete} disabled={!!deletingId} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold">Confirmar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transacciones</h1>
          <p className="text-slate-500 text-sm font-medium">Historial contable y sincronización masiva.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="hidden" />
                <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-md transition-colors text-sm font-bold border-r border-slate-100" title="Descargar Plantilla Maestra con Hojas de Referencia">
                    <FileSpreadsheet size={16} />
                    <span className="hidden sm:inline">Plantilla Maestra</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-colors text-sm font-bold border-r border-slate-100 disabled:opacity-50">
                    <Upload size={16} />
                    <span className="hidden sm:inline">Importar Masivo</span>
                </button>
                <button onClick={handleExportExcel} disabled={isExporting} className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors text-sm font-bold">
                    {isExporting ? <Loader size={16} className="animate-spin"/> : <Download size={16} />}
                    <span className="hidden sm:inline">Exportar</span>
                </button>
            </div>

            <button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg font-bold">
                <Plus size={20} />
                <span className="text-sm">Nuevo Movimiento</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
             <Filter size={16} className="text-slate-400" />
             {/* FILTRO TIPO DE CUENTA */}
             <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 mr-2">
                <Wallet size={14} className="text-slate-400 mr-2" />
                <select className="py-2 bg-transparent outline-none text-sm font-bold text-slate-700" 
                    value={selectedAccountType} onChange={(e) => setSelectedAccountType(e.target.value as any)}>
                    <option value="ALL">TODAS LAS CUENTAS</option>
                    <option value="ACTIVO">SOLO ACTIVOS (BANCOS)</option>
                    <option value="PASIVO">SOLO PASIVOS (TARJETAS)</option>
                </select>
             </div>

             <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm font-bold" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                {Array.from({length: 12}, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleDateString('es-ES', {month: 'long'}).toUpperCase()}</option>))}
             </select>
             <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm font-bold" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-widest border-b border-slate-200 font-black">
                <th className="px-4 py-3">Código / Fecha</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Categoría / Cuenta</th>
                <th className="px-4 py-3">Relaciones Téc.</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium italic">No se encontraron movimientos.</td></tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.code} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-black text-indigo-600 font-mono text-[11px]">{tx.code}</span>
                        <div className="flex items-center text-slate-400 text-[10px] font-bold mt-0.5">
                          <Calendar size={10} className="mr-1" /> {formatDate(tx.date)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700 font-bold block max-w-xs truncate" title={tx.description}>{tx.description}</span>
                    </td>
                    <td className="px-4 py-3">
                        <div className={`flex items-center font-black ${tx.type === 'INGRESO' ? 'text-emerald-600' : tx.type === 'TRANSFERENCIA' ? 'text-blue-600' : 'text-rose-600'}`}>
                            {tx.type === 'INGRESO' ? <ArrowUpCircle size={14} className="mr-1.5" /> : 
                             tx.type === 'TRANSFERENCIA' ? <ArrowRightLeft size={14} className="mr-1.5" /> : <ArrowDownCircle size={14} className="mr-1.5" />}
                            {formatMoney(tx.amount)}
                        </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-bold text-[11px]">{tx.categoryName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{tx.accountName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tx.contractCode && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black border border-indigo-100" title="Contrato">{tx.contractCode}</span>}
                        {tx.serviceCode && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[9px] font-black border border-rose-100" title="Servicio">{tx.serviceCode}</span>}
                        {tx.billablePeriod && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black border border-emerald-100" title="Periodo">{tx.billablePeriod}</span>}
                        {tx.loanCode && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-black border border-amber-100" title="Préstamo">{tx.loanCode}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingTransaction(tx); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => requestDelete(tx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={editingTransaction ? handleUpdate : handleCreate} editingTransaction={editingTransaction} isSubmitting={isSubmitting} />
    </div>
  );
};

export default TransactionsPage;
