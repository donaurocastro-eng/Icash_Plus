
import React from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Search, FileSpreadsheet } from 'lucide-react';
import { Transaction } from '../types';
import * as XLSX from 'xlsx';

interface ReportDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
}

const ReportDrilldownModal: React.FC<ReportDrilldownModalProps> = ({
  isOpen,
  onClose,
  title,
  transactions
}) => {
  if (!isOpen) return null;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (isoString: string) => {
     if (!isoString) return '-';
     const parts = isoString.split('-');
     if (parts.length < 3) return isoString;
     return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleExportToExcel = () => {
    try {
      const dataToExport = transactions.map(tx => ({
        'Fecha': formatDate(tx.date),
        'Descripción': tx.description,
        'Tipo': tx.type,
        'Categoría': tx.categoryName,
        'Cuenta': tx.accountName,
        'Monto': tx.amount,
        'Código': tx.code,
        'Contrato': tx.contractCode || 'N/A',
        'Propiedad': tx.propertyName || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalle_Auditoria");
      
      // Nombre de archivo descriptivo
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      XLSX.writeFile(wb, `auditoria_${safeTitle}.xlsx`);
    } catch (error) {
      console.error("Error al exportar Excel desde modal:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop con blur */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 animate-fadeIn">
        
        {/* Header - Fijo arriba */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Detalle de Movimientos</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{title}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {transactions.length > 0 && (
                <button 
                    onClick={handleExportToExcel}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
                    title="Exportar esta lista a Excel"
                >
                    <FileSpreadsheet size={16} />
                    <span>Exportar Detalle</span>
                </button>
            )}
            <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
            >
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Body - Con Scroll Interno */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="px-6 py-3 border-b">Fecha</th>
                        <th className="px-6 py-3 border-b">Descripción</th>
                        <th className="px-6 py-3 border-b">Categoría</th>
                        <th className="px-6 py-3 border-b text-right">Monto</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                        <tr key={tx.code} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{formatDate(tx.date)}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-700">{tx.description}</div>
                                <div className="text-[10px] text-slate-400 font-mono flex gap-2">
                                    <span>{tx.code}</span>
                                    {tx.contractCode && <span className="bg-slate-100 px-1 rounded">Contrato: {tx.contractCode}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                    {tx.categoryName}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className={`flex items-center justify-end font-black font-mono text-base ${tx.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {tx.type === 'INGRESO' ? <ArrowUpCircle size={14} className="mr-1.5"/> : <ArrowDownCircle size={14} className="mr-1.5"/>}
                                    {formatMoney(tx.amount)}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-20 text-center text-slate-400 font-medium">
                                <div className="flex flex-col items-center gap-2">
                                    <Search size={40} className="opacity-10" />
                                    <p>No se encontraron transacciones en este periodo.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer - Informativo */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
            <span>Total Registros: {transactions.length}</span>
            <span>ICASH_PLUS Auditoría Financiera</span>
        </div>
      </div>
    </div>
  );
};

export default ReportDrilldownModal;
