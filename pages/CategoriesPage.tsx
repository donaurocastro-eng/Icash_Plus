import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Category, CategoryFormData } from '../types';
import { CategoryService } from '../services/categoryService';
import CategoryModal from '../components/CategoryModal';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
          <p className="text-slate-500">Clasifica tus ingresos y gastos.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center justify-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={20} />
          <span className="font-medium">Nueva Categoría</span>
        </button>
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