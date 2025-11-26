import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Building, Users, FileText, MapPin, Upload, FileSpreadsheet, Home, DollarSign, Calendar as CalendarIcon, Filter, Layers, TrendingUp, Zap, ExternalLink } from 'lucide-react';
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
import ServicePaymentModal from '../components/ServicePaymentModal'; // New Import
import * as XLSX from 'xlsx';

type Tab = 'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'PAYMENTS' | 'SERVICES';

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

  // Excel Logic
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    XLSX.writeFile(wb, `plantilla.xlsx`);
  };
  const handleFileSelect = (e: any) => {}; 
  const processExcelFile = async (file: File) => {};

  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Filtering logic
  const lowerSearch = searchTerm.toLowerCase();
  const filteredProperties = properties.filter(p => p.name.toLowerCase().includes(lowerSearch));
  const filteredUnits = apartments.filter(a => a.name.toLowerCase().includes(lowerSearch));
  const filteredTenants = tenants.filter(t => t.fullName.toLowerCase().includes(lowerSearch));
  const filteredContracts = contracts.filter(c => c.code.toLowerCase().includes(lowerSearch));
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(lowerSearch));

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
            <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>
            {activeTab !== 'PAYMENTS' && (
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
            <button className="p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200"><Filter size={18} /></button>
        </div>
        <div className="px-3 pt-2">
            <nav className="flex space-x-6 overflow-x-auto">
            {[
                { id: 'PROPERTIES', label: 'Edificios', icon: MapPin },
                { id: 'UNITS', label: 'Unidades', icon: Home },
                { id: 'TENANTS', label: 'Inquilinos', icon: Users },
                { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
                { id: 'SERVICES', label: 'Servicios', icon: Zap },
                { id: 'PAYMENTS', label: 'Control de Pagos', icon: DollarSign },
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
                        <tbody>{filteredProperties.map(p => (<tr key={p.code} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4">{p.name}</td><td className="p-4">{formatMoney(p.value)}</td><td className="p-4 text-right"><button onClick={() => handleDeleteProp(p.code)}><Trash2 size={16}/></button></td></tr>))}</tbody>
                    </table>
                </div>
            )}

            {activeTab === 'SERVICES' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium"><tr><th className="p-4">Código</th><th className="p-4">Servicio</th><th className="p-4">Propiedad</th><th className="p-4 text-right">Costo Est.</th><th className="p-4 text-center">Acciones</th></tr></thead>
                        <tbody>
                            {filteredServices.map(s => {
                                const prop = properties.find(p => p.code === s.propertyCode);
                                return (
                                <tr key={s.code} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-mono text-xs text-slate-500">{s.code}</td>
                                    <td className="p-4 font-bold text-slate-700">{s.name}</td>
                                    <td className="p-4 text-slate-600">{prop?.name || s.propertyCode}</td>
                                    <td className="p-4 text-right font-mono">{formatMoney(s.defaultAmount)}</td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => { setPayingService(s); setIsServicePaymentModalOpen(true); }}
                                            className="px-2 py-1 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 text-xs font-bold flex items-center gap-1"
                                        >
                                            <DollarSign size={12}/> PAGAR
                                        </button>
                                        <button onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }} className="mr-2 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteService(s.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            )})}
                            {filteredServices.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay servicios registrados</td></tr>}
                        </tbody>
                    </table>
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