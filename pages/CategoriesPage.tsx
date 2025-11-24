import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, ArrowDownCircle, ArrowUpCircle, Upload, FileSpreadsheet } from 'lucide-react';
import { Category, CategoryFormData, CategoryType } from '../types';
import { CategoryService } from '../services/categoryService';
import CategoryModal from '../components/CategoryModal';
import * as XLSX from 'xlsx';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  const loadCategories = async () => {
    try {
      const data = await CategoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Handlers
  const handleCreate = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      await CategoryService.create(data);
      await loadCategories();
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    setIsSubmitting(true);
    try {
      await CategoryService.update(editingCategory.code, data);
      await loadCategories();
      setIsModalOpen(false);
      setEditingCategory(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar la categoría ${code}?`)) return;
    try {
      await CategoryService.delete(code);
      await loadCategories();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openNewModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setIsModalOpen(true);
  };

  // --- EXCEL LOGIC ---

  const handleDownloadTemplate = () => {
    const headers = ['Nombre', 'Tipo'];
    const example = ['Comestibles', 'GASTO'];
    const example2 = ['Salario Mensual', 'INGRESO'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example, example2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Categorias");
    XLSX.writeFile(wb, "plantilla_importar_categorias.xlsx");
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
            let typeRaw = (row['Tipo'] || row['tipo'] || 'GASTO').toString().toUpperCase().trim();
            
            // Normalize Type
            let type: CategoryType = 'GASTO';
            if (typeRaw === 'INGRESO' || typeRaw === 'INC') type = 'INGRESO';
            else type = 'GASTO';

            if (!name) {
              errorCount++;
              continue;
            }

            const categoryData: CategoryFormData = {
              name: String(name),
              type: type
            };

            await CategoryService.create(categoryData);
            successCount++;

          } catch (err) {
            console.error("Error importing row:", row, err);
            errorCount++;
          }
        }

        await loadCategories();
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

  // Filtering
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
          <p className="text-slate-500">Clasifica tus ingresos y gastos.</p>
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
            <span className="font-bold">Nueva Categoría</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar categorías..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Nombre</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Fecha Creación</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Tag size={32} className="opacity-20" />
                      <p>No se encontraron categorías</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {cat.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4">
                      {cat.type === 'GASTO' ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                          <ArrowDownCircle size={14} />
                          <span>GASTO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <ArrowUpCircle size={14} />
                          <span>INGRESO</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(cat.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.code)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={editingCategory ? handleUpdate : handleCreate}
        editingCategory={editingCategory}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default CategoriesPage;