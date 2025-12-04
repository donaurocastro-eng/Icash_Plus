import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Building, Users, FileText, MapPin, Upload, FileSpreadsheet, Home, DollarSign, Calendar as CalendarIcon, Filter, Layers, TrendingUp, Zap, AlertTriangle, MessageCircle, Phone } from 'lucide-react';
import { Property, Tenant, Contract, Apartment, PropertyFormData, TenantFormData, ContractFormData, ApartmentFormData, PaymentFormData, BulkPaymentFormData, PropertyServiceItem, PropertyServiceItemFormData, ServicePaymentFormData } from '../types';
import { PropertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { ContractService } from '../services/contractService';
import { ApartmentService } from '../services/apartmentService';
import { ServiceItemService } from '../services/serviceItemService';
import PropertyModal from '../components/PropertyModal';
import TenantModal from '../components/TenantModal';
import ContractModal from '../components/ContractModal';
import ApartmentModal from '../components/ApartmentModal';
import PaymentModal from '../components/PaymentModal';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import BulkPaymentModal from '../components/BulkPaymentModal';
import ContractPriceHistoryModal from '../components/ContractPriceHistoryModal';
import ServiceItemModal from '../components/ServiceItemModal';
import ServicePaymentModal from '../components/ServicePaymentModal';
import { AccountService } from '../services/accountService';
import { CategoryService } from '../services/categoryService';
import * as XLSX from 'xlsx';

type Tab = 'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'PAYMENTS' | 'SERVICES' | 'DELINQUENTS';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('PROPERTIES');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [services, setServices] = useState<PropertyServiceItem[]>([]);

  // Modal States
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  
  const [isAptModalOpen, setIsAptModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<PropertyServiceItem | null>(null);
  const [isServicePaymentModalOpen, setIsServicePaymentModalOpen] = useState(false);
  const [payingService, setPayingService] = useState<PropertyServiceItem | null>(null);

  // Payment Modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); 
  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState(false);
  
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [payingContract, setPayingContract] = useState<Contract | null>(null);
  const [paymentDescription, setPaymentDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const p = await PropertyService.getAll().catch(e => []);
      const t = await TenantService.getAll().catch(e => []);
      const a = await ApartmentService.getAll().catch(e => []);
      const c = await ContractService.getAll().catch(e => []);
      const s = await ServiceItemService.getAll().catch(e => []);
      setProperties(p);
      setTenants(t);
      setApartments(a);
      setContracts(c);
      setServices(s);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // --- Handlers ---
  const handleCreateProp = async (d: PropertyFormData) => { setIsSubmitting(true); await PropertyService.create(d); await loadAll(); setIsPropModalOpen(false); setIsSubmitting(false); };
  const handleUpdateProp = async (d: PropertyFormData) => { if(!editingProp) return; setIsSubmitting(true); await PropertyService.update(editingProp.code, d); await loadAll(); setIsPropModalOpen(false); setIsSubmitting(false); };
  const handleDeleteProp = async (c: string) => { if(confirm('¿Borrar?')) { await PropertyService.delete(c); await loadAll(); } };

  const handleCreateTenant = async (d: TenantFormData) => { setIsSubmitting(true); await TenantService.create(d); await loadAll(); setIsTenantModalOpen(false); setIsSubmitting(false); };
  const handleUpdateTenant = async (d: TenantFormData) => { if(!editingTenant) return; setIsSubmitting(true); await TenantService.update(editingTenant.code, d); await loadAll(); setIsTenantModalOpen(false); setIsSubmitting(false); };
  const handleDeleteTenant = async (c: string) => { if(confirm('¿Borrar?')) { await TenantService.delete(c); await loadAll(); } };

  const handleCreateApt = async (d: ApartmentFormData) => { setIsSubmitting(true); await ApartmentService.create(d); await loadAll(); setIsAptModalOpen(false); setIsSubmitting(false); };
  const handleUpdateApt = async (d: ApartmentFormData) => { if(!editingApt) return; setIsSubmitting(true); await ApartmentService.update(editingApt.code, d); await loadAll(); setIsAptModalOpen(false); setIsSubmitting(false); };
  const handleDeleteApt = async (c: string) => { if(confirm('¿Borrar Unidad?')) { await ApartmentService.delete(c); await loadAll(); } };

  const handleCreateContract = async (d: ContractFormData) => { setIsSubmitting(true); await ContractService.create(d); await loadAll(); setIsContractModalOpen(false); setIsSubmitting(false); };
  const handleUpdateContract = async (d: ContractFormData) => { if(!editingContract) return; setIsSubmitting(true); await ContractService.update(editingContract.code, d); await loadAll(); setIsContractModalOpen(false); setIsSubmitting(false); };
  const handleDeleteContract = async (c: string) => { if(confirm('¿Borrar?')) { await ContractService.delete(c); await loadAll(); } };

  const handleCreateService = async (d: PropertyServiceItemFormData) => { setIsSubmitting(true); await ServiceItemService.create(d); await loadAll(); setIsServiceModalOpen(false); setIsSubmitting(false); };
  const handleUpdateService = async (d: PropertyServiceItemFormData) => { if(!editingService) return; setIsSubmitting(true); await ServiceItemService.update(editingService.code, d); await loadAll(); setIsServiceModalOpen(false); setIsSubmitting(false); };
  const handleDeleteService = async (c: string) => { if(confirm('¿Borrar servicio?')) { await ServiceItemService.delete(c); await loadAll(); } };
  
  const handleRegisterServicePayment = async (d: ServicePaymentFormData) => {
      setIsSubmitting(true);
      try {
          await ServiceItemService.registerPayment(d);
          await loadAll();
          setIsServicePaymentModalOpen(false);
          alert("¡Pago de servicio registrado con éxito!");
      } catch(e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  const handleInitiatePayment = (dateToPay: Date) => {
      const monthName = dateToPay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      setPaymentDescription(`Alquiler ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`);
      setPayingContract(viewingContract); 
      setIsHistoryModalOpen(false);
      setIsPaymentModalOpen(true); 
  };

  const handleRegisterPayment = async (d: PaymentFormData) => {
      setIsSubmitting(true);
      try {
          await ContractService.registerPayment(d);
          await loadAll();
          setIsPaymentModalOpen(false);
          alert("¡Pago registrado con éxito!");
      } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  const handleBulkPayment = async (d: BulkPaymentFormData) => {
      setIsSubmitting(true);
      try {
          await ContractService.processBulkPayment(d);
          await loadAll();
          setIsBulkModalOpen(false);
          alert("¡Pagos masivos registrados con éxito!");
      } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  const openWhatsApp = (tenant: Tenant, contract: Contract, aptName: string, daysLate: number) => {
      if (!tenant.phone) return;
      const cleanPhone = tenant.phone.replace(/[^0-9]/g, '');
      const message = `Hola ${tenant.fullName}, le saludamos para recordarle que el alquiler de ${aptName} venció el ${new Date(contract.nextPaymentDate).toLocaleDateString()}. Tiene ${daysLate} días de atraso. Agradecemos su pago.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- Excel Logic ---
  const handleDownloadTemplate = async () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === 'SERVICES') {
        const headers = ['Propiedad_Codigo', 'Nombre_Servicio', 'Costo_Estimado', 'Categoria_Gasto_Codigo', 'Cuenta_Pago_Codigo', 'Activo (SI/NO)'];
        const example = ['AP-001', 'Agua Potable', 500, 'CAT-EXP-001', 'CTA-001', 'SI'];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        XLSX.utils.book_append_sheet(wb, ws, "Servicios");
        XLSX.writeFile(wb, "plantilla_servicios.xlsx");
        return;
    }

    const headers = ['Nombre', 'Valor', 'Moneda (HNL/USD)'];
    const example = ['Edificio Central', 5000000, 'HNL'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    XLSX.utils.book_append_sheet(wb, ws, "Propiedades");
    XLSX.writeFile(wb, `plantilla_bienes_raices.xlsx`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processExcelFile(e.target.files[0]);
    e.target.value = '';
  };

  const processExcelFile = async (file: File) => {
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const wb = XLSX.read(data, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
            if (json.length === 0) { alert("Archivo vacío"); return; }

            let success = 0, errors = 0;

            if (activeTab === 'SERVICES') {
                for (const row of json) {
                    try {
                        const propCode = row['Propiedad_Codigo'] || row['propiedad'];
                        const name = row['Nombre_Servicio'] || row['nombre'];
                        const amount = parseFloat(row['Costo_Estimado'] || row['costo']);
                        const catCode = row['Categoria_Gasto_Codigo'] || row['categoria'];
                        const accCode = row['Cuenta_Pago_Codigo'] || row['cuenta'];
                        const activeStr = row['Activo (SI/NO)'] || 'SI';
                        
                        if (!propCode || !name) { errors++; continue; }

                        await ServiceItemService.create({
                            propertyCode: String(propCode),
                            name: String(name),
                            defaultAmount: amount || 0,
                            defaultCategoryCode: catCode ? String(catCode) : undefined,
                            defaultAccountCode: accCode ? String(accCode) : undefined,
                            active: activeStr.toString().toUpperCase() === 'SI'
                        });
                        success++;
                    } catch (err) { console.error(err); errors++; }
                }
            } else {
                for (const row of json) {
                    try {
                        const name = row['Nombre'] || row['nombre'];
                        const val = parseFloat(row['Valor'] || 0);
                        const curr = row['Moneda (HNL/USD)'] || 'HNL';
                        if (!name) continue;
                        await PropertyService.create({ name: String(name), value: val, currency: curr as any, cadastralKey: '', annualTax: 0 });
                        success++;
                    } catch (err) { errors++; }
                }
            }

            await loadAll();
            alert(`Importación: ${success} exitosos, ${errors} fallidos.`);
        } catch (err) { console.error(err); alert("Error al leer archivo."); }
        finally { setIsImporting(false); }
    };
    reader.readAsBinaryString(file);
  };

  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Filtering logic
  const lowerSearch = searchTerm.toLowerCase();

  const filteredProperties = properties.filter(p => p.name.toLowerCase().includes(lowerSearch) || p.code.toLowerCase().includes(lowerSearch));
  
  const filteredUnits = apartments.filter(a => {
      const parent = properties.find(p => p.code === a.propertyCode);
      return a.name.toLowerCase().includes(lowerSearch) || a.code.toLowerCase().includes(lowerSearch) || parent?.name.toLowerCase().includes(lowerSearch);
  });

  const filteredTenants = tenants.filter(t => t.fullName.toLowerCase().includes(lowerSearch) || t.phone?.includes(lowerSearch));

  const filteredContracts = contracts.filter(c => {
      const ten = tenants.find(t => t.code === c.tenantCode);
      const apt = apartments.find(a => a.code === c.apartmentCode);
      return c.code.toLowerCase().includes(lowerSearch) || ten?.fullName.toLowerCase().includes(lowerSearch) || apt?.name.toLowerCase().includes(lowerSearch);
  });

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(lowerSearch) || s.code.toLowerCase().includes(lowerSearch));

  // --- DELINQUENTS FILTER (FIXED LOGIC) ---
  const delinquentContracts = contracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      
      // FIX: Use strictly LOCAL date components to construct YYYY-MM-DD
      // This avoids timezone offsets causing the date to shift to tomorrow/yesterday
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const nextDateStr = c.nextPaymentDate ? c.nextPaymentDate.split('T')[0] : c.startDate.split('T')[0];
      
      // If today is STRICTLY GREATER than nextDate, it's overdue.
      // e.g. Today 23rd, Due 22nd -> True.
      // e.g. Today 22nd, Due 22nd -> False.
      const isOverdue = todayStr > nextDateStr;
      
      if (!isOverdue) return false;

      // Apply Search Filter
      const ten = tenants.find(t => t.code === c.tenantCode);
      const apt = apartments.find(a => a.code === c.apartmentCode);
      return ten?.fullName.toLowerCase().includes(lowerSearch) || apt?.name.toLowerCase().includes(lowerSearch);
  });

  const getPayingContractLabel = () => {
      const c = viewingContract || payingContract;
      if(!c) return '';
      const apt = apartments.find(a => a.code === c.apartmentCode);
      const ten = tenants.find(t => t.code === c.tenantCode);
      return `${ten?.fullName || 'Inquilino'} - ${apt?.name || 'Unidad'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex gap-2"><Building className="text-brand-600"/> Bienes Raíces</h1>
        <div className="flex flex-wrap items-center gap-3">
            {activeTab !== 'PAYMENTS' && activeTab !== 'DELINQUENTS' && (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="hidden" />
                <button onClick={handleDownloadTemplate} className="px-3 py-2 text-slate-600 hover:bg-slate-50 text-sm font-medium border-r border-slate-100" title="Descargar Plantilla"><FileSpreadsheet size={16}/></button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 text-sm font-medium disabled:opacity-50" title="Importar">
                    {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full"/> : <Upload size={16} />}
                </button>
                </div>
            )}
            <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>
            {activeTab !== 'PAYMENTS' && activeTab !== 'DELINQUENTS' && (
            <button onClick={() => {
                    if(activeTab === 'PROPERTIES') { setEditingProp(null); setIsPropModalOpen(true); }
                    if(activeTab === 'UNITS') { setEditingApt(null); setIsAptModalOpen(true); }
                    if(activeTab === 'TENANTS') { setEditingTenant(null); setIsTenantModalOpen(true); }
                    if(activeTab === 'CONTRACTS') { setEditingContract(null); setIsContractModalOpen(true); }
                    if(activeTab === 'SERVICES') { setEditingService(null); setIsServiceModalOpen(true); }
                }} 
                className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 flex gap-2 items-center shadow-sm">
                <Plus size={16}/> <span className="hidden sm:inline">Nuevo</span>
            </button>
            )}
        </div>
      </div>

      <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 border-b border-slate-100 flex gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-sm"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="px-3 pt-2">
            <nav className="flex space-x-6 overflow-x-auto">
            {[
                { id: 'PROPERTIES', label: 'Edificios', icon: MapPin },
                { id: 'UNITS', label: 'Unidades', icon: Home },
                { id: 'TENANTS', label: 'Inquilinos', icon: Users },
                { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
                { id: 'SERVICES', label: 'Servicios', icon: Zap },
                { id: 'PAYMENTS', label: 'Control Pagos', icon: DollarSign },
                { id: 'DELINQUENTS', label: 'En Mora', icon: AlertTriangle },
            ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`pb-3 flex items-center gap-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <tab.icon size={16} /> {tab.label}
                </button>
            ))}
            </nav>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div> : (
        <>
            {activeTab === 'PROPERTIES' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium"><tr><th className="p-4">Nombre</th><th className="p-4">Valor</th><th className="p-4 text-right">Acciones</th></tr></thead>
                        <tbody>{filteredProperties.map(p => (<tr key={p.code} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4">{p.name}</td><td className="p-4">{formatMoney(p.value)} {p.currency}</td><td className="p-4 text-right"><button onClick={() => handleDeleteProp(p.code)}><Trash2 size={16}/></button></td></tr>))}</tbody>
                    </table>
                </div>
            )}
            
            {activeTab === 'UNITS' && (
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
               <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 font-medium"><tr><th className="p-4">Unidad</th><th className="p-4">Edificio</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr></thead>
                   <tbody>
                       {filteredUnits.map(a => {
                           const parent = properties.find(p => p.code === a.propertyCode);
                           return (
                           <tr key={a.code} className="border-t border-slate-100 hover:bg-slate-50">
                               <td className="p-4"><div className="font-bold">{a.name}</div><div className="text-xs text-slate-400">{a.code}</div></td>
                               <td className="p-4 text-slate-600">{parent?.name || a.propertyCode}</td>
                               <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${a.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span></td>
                               <td className="p-4 text-right">
                                   <button onClick={() => { setEditingApt(a); setIsAptModalOpen(true); }} className="mr-2 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                   <button onClick={() => handleDeleteApt(a.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                               </td>
                           </tr>
                       )})}
                   </tbody>
               </table>
           </div>
            )}

            {activeTab === 'TENANTS' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-medium"><tr><th className="p-4">Nombre</th><th className="p-4">Contacto</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr></thead>
                    <tbody>
                        {filteredTenants.map(t => (
                            <tr key={t.code} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-4"><div className="font-bold">{t.fullName}</div><div className="text-xs text-slate-400">{t.code}</div></td>
                                <td className="p-4 text-slate-600"><div className="text-xs">{t.phone}</div><div className="text-xs">{t.email}</div></td>
                                <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}</span></td>
                                <td className="p-4 text-right">
                                    <button onClick={() => { setEditingTenant(t); setIsTenantModalOpen(true); }} className="mr-2 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteTenant(t.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}

            {activeTab === 'CONTRACTS' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-medium">
                        <tr>
                            <th className="p-4">Inquilino / Unidad</th>
                            <th className="p-4">Vigencia</th>
                            <th className="p-4 text-center">Día Pago</th>
                            <th className="p-4">Fecha Próx. Pago</th>
                            <th className="p-4">Monto</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContracts.map(c => {
                            const apt = apartments.find(a => a.code === c.apartmentCode);
                            const ten = tenants.find(t => t.code === c.tenantCode);
                            return (
                            <tr key={c.code} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{ten?.fullName || 'Desconocido'}</div>
                                    <div className="text-xs text-slate-500">{apt?.name || c.apartmentCode}</div>
                                </td>
                                <td className="p-4 text-xs text-slate-500">{c.startDate} - {c.endDate}</td>
                                <td className="p-4 text-center">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">Día {c.paymentDay}</span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 text-sm font-bold">
                                    {new Date(c.nextPaymentDate).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-700">{formatMoney(c.amount)}</div>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => { setViewingContract(c); setIsPriceHistoryModalOpen(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Historial"><TrendingUp size={16}/></button>
                                    <button onClick={() => { setEditingContract(c); setIsContractModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteContract(c.code)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
            )}

            {activeTab === 'SERVICES' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium"><tr><th className="p-4">Servicio</th><th className="p-4">Propiedad</th><th className="p-4 text-right">Costo</th><th className="p-4 text-center">Acciones</th></tr></thead>
                        <tbody>
                            {filteredServices.map(s => {
                                const prop = properties.find(p => p.code === s.propertyCode);
                                return (
                                <tr key={s.code} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-700">{s.name}</td>
                                    <td className="p-4 text-slate-600">{prop?.name}</td>
                                    <td className="p-4 text-right font-mono">{formatMoney(s.defaultAmount)}</td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => { setPayingService(s); setIsServicePaymentModalOpen(true); }} className="px-2 py-1 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 text-xs font-bold flex items-center gap-1"><DollarSign size={12}/> PAGAR</button>
                                        <button onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }} className="mr-2 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteService(s.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'PAYMENTS' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-800 font-bold"><CalendarIcon size={20} /> Calendario de Pagos</div>
                        <div className="text-xs text-indigo-600">Hoy: {new Date().toLocaleDateString()}</div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium text-slate-500"><tr><th className="p-4">Estado</th><th className="p-4">Inquilino / Unidad</th><th className="p-4 text-right">Próximo Pago</th><th className="p-4 text-right">Monto</th><th className="p-4 text-center">Acción</th></tr></thead>
                        <tbody>
                            {filteredContracts.map(c => {
                                const apt = apartments.find(a => a.code === c.apartmentCode);
                                const ten = tenants.find(t => t.code === c.tenantCode);
                                
                                // FIX: Use strictly LOCAL date
                                const now = new Date();
                                const year = now.getFullYear();
                                const month = String(now.getMonth() + 1).padStart(2, '0');
                                const day = String(now.getDate()).padStart(2, '0');
                                const todayStr = `${year}-${month}-${day}`;
                                
                                const nextDateStr = c.nextPaymentDate ? c.nextPaymentDate.split('T')[0] : c.startDate.split('T')[0];
                                
                                const isOverdue = todayStr > nextDateStr;

                                return (
                                    <tr key={c.code} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{isOverdue ? 'MORA' : 'AL DÍA'}</span></td>
                                        <td className="p-4"><div className="font-bold text-slate-800">{ten?.fullName}</div><div className="text-xs text-slate-500">{apt?.name}</div></td>
                                        <td className="p-4 text-right font-mono">{new Date(c.nextPaymentDate).toLocaleDateString()}</td>
                                        <td className="p-4 text-right font-bold text-slate-700">{formatMoney(c.amount)}</td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button onClick={() => { setViewingContract(c); setIsHistoryModalOpen(true); }} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-xs font-bold">HISTORIAL</button>
                                            <button onClick={() => { setViewingContract(c); setIsBulkModalOpen(true); }} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm text-xs font-bold flex items-center gap-1"><Layers size={14}/> MASIVO</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'DELINQUENTS' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
                        <AlertTriangle className="text-rose-600" size={24}/>
                        <div>
                            <h3 className="font-bold text-rose-800 text-lg">Reporte de Morosidad</h3>
                            <p className="text-xs text-rose-600">Inquilinos con pagos vencidos</p>
                        </div>
                    </div>
                    {delinquentContracts.length === 0 ? (
                        <div className="p-12 text-center text-emerald-600 flex flex-col items-center">
                            <Zap size={48} className="mb-2 opacity-50"/>
                            <p className="font-bold">¡Excelente! No hay inquilinos en mora.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 font-medium text-slate-500">
                                <tr>
                                    <th className="p-4">Inquilino</th>
                                    <th className="p-4">Contacto</th>
                                    <th className="p-4">Unidad</th>
                                    <th className="p-4 text-right">Vencimiento</th>
                                    <th className="p-4 text-right">Días Atraso</th>
                                    <th className="p-4 text-right">Monto</th>
                                    <th className="p-4 text-center">Gestión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {delinquentContracts.map(c => {
                                    const apt = apartments.find(a => a.code === c.apartmentCode);
                                    const ten = tenants.find(t => t.code === c.tenantCode);
                                    
                                    // Use same LOCAL logic as filter for days calculation
                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                    const day = String(now.getDate()).padStart(2, '0');
                                    const todayStr = `${year}-${month}-${day}`;
                                    
                                    const nextDateStr = c.nextPaymentDate ? c.nextPaymentDate.split('T')[0] : c.startDate.split('T')[0];
                                    
                                    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(nextDateStr).getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                                    return (
                                        <tr key={c.code} className="hover:bg-rose-50/10 transition-colors">
                                            <td className="p-4 font-bold text-slate-800">{ten?.fullName}</td>
                                            <td className="p-4 text-xs text-slate-500 flex flex-col gap-1">
                                                {ten?.phone && <span className="flex items-center gap-1"><Phone size={12}/> {ten.phone}</span>}
                                                {ten?.email && <span>{ten.email}</span>}
                                            </td>
                                            <td className="p-4 text-slate-600">{apt?.name}</td>
                                            <td className="p-4 text-right font-mono text-rose-600 font-bold">{nextDateStr}</td>
                                            <td className="p-4 text-right">
                                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold">{diffDays} días</span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-700">{formatMoney(c.amount)}</td>
                                            <td className="p-4 text-center flex justify-center gap-2">
                                                {ten?.phone && (
                                                    <button 
                                                        onClick={() => openWhatsApp(ten, c, apt?.name || '', diffDays)}
                                                        className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm flex items-center gap-2 text-xs font-bold transition-transform active:scale-95"
                                                        title="Enviar recordatorio por WhatsApp"
                                                    >
                                                        <MessageCircle size={16}/> Cobrar
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => { setViewingContract(c); setIsHistoryModalOpen(true); }}
                                                    className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 shadow-sm text-xs font-bold"
                                                >
                                                    Pagar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </>
      )}

      {/* Modals */}
      <PropertyModal isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} onSubmit={editingProp ? handleUpdateProp : handleCreateProp} editingProperty={editingProp} isSubmitting={isSubmitting} />
      <ApartmentModal isOpen={isAptModalOpen} onClose={() => setIsAptModalOpen(false)} onSubmit={editingApt ? handleUpdateApt : handleCreateApt} editingApartment={editingApt} isSubmitting={isSubmitting} />
      <TenantModal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} onSubmit={editingTenant ? handleUpdateTenant : handleCreateTenant} editingTenant={editingTenant} isSubmitting={isSubmitting} />
      <ContractModal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} onSubmit={editingContract ? handleUpdateContract : handleCreateContract} editingContract={editingContract} isSubmitting={isSubmitting} />
      
      <PaymentHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} contract={viewingContract} contractLabel={getPayingContractLabel()} onRegisterPayment={handleInitiatePayment} />
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onSubmit={handleRegisterPayment} contract={payingContract} contractLabel={getPayingContractLabel()} initialDescription={paymentDescription} isSubmitting={isSubmitting} />
      <BulkPaymentModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} onSubmit={handleBulkPayment} contract={viewingContract} contractLabel={getPayingContractLabel()} isSubmitting={isSubmitting} />
      <ContractPriceHistoryModal isOpen={isPriceHistoryModalOpen} onClose={() => setIsPriceHistoryModalOpen(false)} contract={viewingContract} contractLabel={getPayingContractLabel()} />
      
      <ServiceItemModal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} onSubmit={editingService ? handleUpdateService : handleCreateService} editingItem={editingService} isSubmitting={isSubmitting} />
      <ServicePaymentModal isOpen={isServicePaymentModalOpen} onClose={() => setIsServicePaymentModalOpen(false)} onSubmit={handleRegisterServicePayment} serviceItem={payingService} isSubmitting={isSubmitting} />
    </div>
  );
};

export default RealEstatePage;