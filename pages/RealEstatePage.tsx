
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Building, Users, FileText, MapPin, Upload, FileSpreadsheet } from 'lucide-react';
import { Property, Tenant, Contract, PropertyFormData, TenantFormData, ContractFormData, Currency } from '../types';
import { PropertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { ContractService } from '../services/contractService';
import PropertyModal from '../components/PropertyModal';
import TenantModal from '../components/TenantModal';
import ContractModal from '../components/ContractModal';
import * as XLSX from 'xlsx';

type Tab = 'PROPERTIES' | 'TENANTS' | 'CONTRACTS';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('PROPERTIES');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Modal States
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Load
  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, t, c] = await Promise.all([
        PropertyService.getAll(),
        TenantService.getAll(),
        ContractService.getAll()
      ]);
      setProperties(p);
      setTenants(t);
      setContracts(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // --- Handlers: Properties ---
  const handleCreateProp = async (data: PropertyFormData) => {
    setIsSubmitting(true);
    try {
      await PropertyService.create(data);
      await loadAll();
      setIsPropModalOpen(false);
    } finally { setIsSubmitting(false); }
  };

  const handleUpdateProp = async (data: PropertyFormData) => {
    if (!editingProp) return;
    setIsSubmitting(true);
    try {
      await PropertyService.update(editingProp.code, data);
      await loadAll();
      setIsPropModalOpen(false);
      setEditingProp(null);
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteProp = async (code: string) => {
    if(!window.confirm(`¿Eliminar propiedad ${code}?`)) return;
    await PropertyService.delete(code);
    await loadAll();
  };

  // --- Handlers: Tenants ---
  const handleCreateTenant = async (data: TenantFormData) => {
    setIsSubmitting(true);
    try {
      await TenantService.create(data);
      await loadAll();
      setIsTenantModalOpen(false);
    } finally { setIsSubmitting(false); }
  };

  const handleUpdateTenant = async (data: TenantFormData) => {
    if (!editingTenant) return;
    setIsSubmitting(true);
    try {
      await TenantService.update(editingTenant.code, data);
      await loadAll();
      setIsTenantModalOpen(false);
      setEditingTenant(null);
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteTenant = async (code: string) => {
    if(!window.confirm(`¿Eliminar inquilino ${code}?`)) return;
    await TenantService.delete(code);
    await loadAll();
  };

  // --- Handlers: Contracts ---
  const handleCreateContract = async (data: ContractFormData) => {
    setIsSubmitting(true);
    try {
      await ContractService.create(data);
      await loadAll();
      setIsContractModalOpen(false);
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteContract = async (code: string) => {
    if(!window.confirm(`¿Eliminar contrato ${code}?`)) return;
    await ContractService.delete(code);
    await loadAll();
  };

  // --- EXCEL LOGIC ---

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === 'PROPERTIES') {
        const headers = ['Nombre', 'Clave_Catastral', 'Impuesto_Anual', 'Valor', 'Moneda'];
        const example = ['Apartamento 3B', '0801-2000-12345', 1500, 2500000, 'HNL'];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        XLSX.utils.book_append_sheet(wb, ws, "Propiedades");
        XLSX.writeFile(wb, "plantilla_propiedades.xlsx");
    } else if (activeTab === 'TENANTS') {
        const headers = ['Nombre_Completo', 'Telefono', 'Email', 'Estado'];
        const example = ['Juan Pérez', '9999-9999', 'juan@email.com', 'ACTIVO'];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        XLSX.utils.book_append_sheet(wb, ws, "Inquilinos");
        XLSX.writeFile(wb, "plantilla_inquilinos.xlsx");
    } else if (activeTab === 'CONTRACTS') {
        const headers = ['Codigo_Propiedad', 'Codigo_Inquilino', 'Fecha_Inicio', 'Fecha_Fin', 'Monto', 'Dia_Pago'];
        const example = ['AP-001', 'INQ-001', '2024-01-01', '2024-12-31', 5500.00, 15];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        XLSX.utils.book_append_sheet(wb, ws, "Contratos");
        XLSX.writeFile(wb, "plantilla_contratos.xlsx");
    }
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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
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
            if (activeTab === 'PROPERTIES') {
                const name = row['Nombre'] || row['nombre'] || row['Name'];
                if (!name) { errorCount++; continue; }

                const cadastralKey = String(row['Clave_Catastral'] || row['clave_catastral'] || row['Cadastral'] || '');
                const annualTax = parseFloat(row['Impuesto_Anual'] || row['impuesto'] || '0') || 0;
                const value = parseFloat(row['Valor'] || row['valor'] || '0') || 0;
                
                let currRaw = (row['Moneda'] || row['moneda'] || 'HNL').toString().toUpperCase().trim();
                const currency: Currency = (currRaw === 'USD') ? 'USD' : 'HNL';

                await PropertyService.create({
                  name: String(name),
                  cadastralKey: cadastralKey,
                  annualTax: annualTax,
                  value: value,
                  currency: currency
                });
                successCount++;

            } else if (activeTab === 'TENANTS') {
                const fullName = row['Nombre_Completo'] || row['Nombre'] || row['nombre'];
                if (!fullName) { errorCount++; continue; }
                
                const phone = row['Telefono'] || row['telefono'] || '';
                const email = row['Email'] || row['email'] || '';
                
                let statusRaw = (row['Estado'] || row['estado'] || 'ACTIVO').toString().toUpperCase();
                const status = (statusRaw === 'INACTIVO' || statusRaw === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';

                await TenantService.create({
                    fullName: String(fullName),
                    phone: String(phone),
                    email: String(email),
                    status: status
                });
                successCount++;

            } else if (activeTab === 'CONTRACTS') {
                const pCode = row['Codigo_Propiedad'] || row['Propiedad'];
                const tCode = row['Codigo_Inquilino'] || row['Inquilino'];
                
                // Helper to format date
                const formatDate = (d: any) => {
                    if (d instanceof Date) return d.toISOString().split('T')[0];
                    if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
                    return String(d).trim();
                };

                const start = formatDate(row['Fecha_Inicio'] || row['Inicio']);
                const end = formatDate(row['Fecha_Fin'] || row['Fin']);
                const amount = parseFloat(row['Monto'] || '0');
                const paymentDay = parseInt(row['Dia_Pago'] || '1');

                if (!pCode || !tCode || !start || !end || !amount) { errorCount++; continue; }

                await ContractService.create({
                    propertyCode: String(pCode),
                    tenantCode: String(tCode),
                    startDate: start,
                    endDate: end,
                    amount: amount,
                    paymentDay: paymentDay
                });
                successCount++;
            }

          } catch (err) {
            console.error("Error importing row:", row, err);
            errorCount++;
          }
        }

        await loadAll();
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

  // Helper for currency formatting (2 decimals mandatory)
  const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- Render Functions ---

  const renderProperties = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Código / Nombre</th>
              <th className="px-6 py-4">Clave Catastral</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 text-right">Impuesto Anual</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {properties.map(p => (
              <tr key={p.code} className="hover:bg-slate-50/80">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded w-fit mt-1">{p.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{p.cadastralKey || 'N/A'}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-700">
                   {formatMoney(p.value)} {p.currency}
                </td>
                <td className="px-6 py-4 text-right text-slate-500">
                   {formatMoney(p.annualTax)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setEditingProp(p); setIsPropModalOpen(true); }} className="text-slate-400 hover:text-brand-600 mr-2"><Edit2 size={16}/></button>
                  <button onClick={() => handleDeleteProp(p.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {properties.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No hay propiedades registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTenants = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
                <th className="px-6 py-4">Código / Nombre</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-right">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {tenants.map(t => (
                <tr key={t.code} className="hover:bg-slate-50/80">
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{t.fullName}</span>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-1">{t.code}</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col text-slate-600 space-y-1">
                        {t.phone && <span className="text-xs flex items-center gap-1">📞 {t.phone}</span>}
                        {t.email && <span className="text-xs flex items-center gap-1">✉️ {t.email}</span>}
                        {!t.phone && !t.email && <span className="text-xs italic text-slate-400">Sin contacto</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'INACTIVE' 
                        ? 'bg-slate-100 text-slate-500 border border-slate-200' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                        {t.status === 'INACTIVE' ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingTenant(t); setIsTenantModalOpen(true); }} className="text-slate-400 hover:text-brand-600 mr-2"><Edit2 size={16}/></button>
                    <button onClick={() => handleDeleteTenant(t.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
                </tr>
            ))}
             {tenants.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">No hay inquilinos registrados</td></tr>
            )}
            </tbody>
        </table>
        </div>
    </div>
  );

  const renderContracts = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4">Propiedad</th>
                <th className="px-6 py-4">Inquilino</th>
                <th className="px-6 py-4">Vigencia</th>
                <th className="px-6 py-4">Monto / Día Pago</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {contracts.map(c => {
                const prop = properties.find(p => p.code === c.propertyCode);
                const ten = tenants.find(t => t.code === c.tenantCode);
                return (
                <tr key={c.code} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-slate-600">{c.code}</span>
                        <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                ACTIVE
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{prop?.name || c.propertyCode}</span>
                            <span className="text-xs text-slate-400">{c.propertyCode}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{ten?.fullName || c.tenantCode}</span>
                            <span className="text-xs text-slate-400">{c.tenantCode}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                        <div>Desde: {c.startDate}</div>
                        <div>Hasta: {c.endDate}</div>
                    </td>
                    <td className="px-6 py-4">
                         <div className="font-bold text-slate-700">{formatMoney(c.amount)}</div>
                         <div className="text-xs text-slate-500">Día {c.paymentDay} de cada mes</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteContract(c.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </td>
                </tr>
            )})}
            {contracts.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hay contratos registrados</td></tr>
            )}
            </tbody>
        </table>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="text-brand-600" />
            Bienes Raíces
          </h1>
          <p className="text-slate-500">Gestión de Propiedades, Inquilinos y Contratos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Excel Actions Group (Available for ALL tabs now) */}
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
            onClick={() => {
                if(activeTab === 'PROPERTIES') { setEditingProp(null); setIsPropModalOpen(true); }
                if(activeTab === 'TENANTS') { setEditingTenant(null); setIsTenantModalOpen(true); }
                if(activeTab === 'CONTRACTS') setIsContractModalOpen(true);
            }}
            className="flex items-center justify-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 active:scale-95"
            >
            <Plus size={20} />
            <span className="font-medium">
                {activeTab === 'PROPERTIES' && 'Nueva Propiedad'}
                {activeTab === 'TENANTS' && 'Nuevo Inquilino'}
                {activeTab === 'CONTRACTS' && 'Nuevo Contrato'}
            </span>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('PROPERTIES')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'PROPERTIES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <MapPin size={18} />
            Propiedades
          </button>
          <button
            onClick={() => setActiveTab('TENANTS')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'TENANTS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <Users size={18} />
            Inquilinos
          </button>
          <button
            onClick={() => setActiveTab('CONTRACTS')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'CONTRACTS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <FileText size={18} />
            Contratos
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <>
            {activeTab === 'PROPERTIES' && renderProperties()}
            {activeTab === 'TENANTS' && renderTenants()}
            {activeTab === 'CONTRACTS' && renderContracts()}
        </>
      )}

      <PropertyModal 
        isOpen={isPropModalOpen}
        onClose={() => setIsPropModalOpen(false)}
        onSubmit={editingProp ? handleUpdateProp : handleCreateProp}
        editingProperty={editingProp}
        isSubmitting={isSubmitting}
      />

      <TenantModal 
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        onSubmit={editingTenant ? handleUpdateTenant : handleCreateTenant}
        editingTenant={editingTenant}
        isSubmitting={isSubmitting}
      />

      <ContractModal 
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onSubmit={handleCreateContract}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default RealEstatePage;