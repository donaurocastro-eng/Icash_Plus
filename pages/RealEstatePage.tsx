import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Building, Users, FileText, MapPin, Upload, FileSpreadsheet, Home, DollarSign, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Property, Tenant, Contract, Apartment, PropertyFormData, TenantFormData, ContractFormData, ApartmentFormData, PaymentFormData } from '../types';
import { PropertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { ContractService } from '../services/contractService';
import { ApartmentService } from '../services/apartmentService';
import PropertyModal from '../components/PropertyModal';
import TenantModal from '../components/TenantModal';
import ContractModal from '../components/ContractModal';
import ApartmentModal from '../components/ApartmentModal';
import PaymentModal from '../components/PaymentModal';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import * as XLSX from 'xlsx';

type Tab = 'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'PAYMENTS';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('PROPERTIES');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Modal States
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  
  const [isAptModalOpen, setIsAptModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Payment Modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [payingContract, setPayingContract] = useState<Contract | null>(null);
  const [paymentDescription, setPaymentDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const p = await PropertyService.getAll().catch(e => { console.error("Error properties", e); return []; });
      const t = await TenantService.getAll().catch(e => { console.error("Error tenants", e); return []; });
      const a = await ApartmentService.getAll().catch(e => { console.error("Error apartments", e); return []; });
      const c = await ContractService.getAll().catch(e => { console.error("Error contracts", e); return []; });

      setProperties(p);
      setTenants(t);
      setApartments(a);
      setContracts(c);
    } catch (e) { 
        console.error("Critical error", e); 
    } finally { 
        setLoading(false); 
    }
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
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  // Excel Logic
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    // Logic placeholder
    XLSX.writeFile(wb, "plantilla.xlsx");
  };
  const handleFileSelect = (e: any) => {}; 

  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- FILTERING LOGIC ---
  const lowerSearch = searchTerm.toLowerCase();
  
  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(lowerSearch) || 
    p.code.toLowerCase().includes(lowerSearch)
  );
  
  const filteredUnits = apartments.filter(a => 
    a.name.toLowerCase().includes(lowerSearch) || 
    a.code.toLowerCase().includes(lowerSearch)
  );
  
  const filteredTenants = tenants.filter(t => 
    t.fullName.toLowerCase().includes(lowerSearch) || 
    t.phone?.includes(lowerSearch) || 
    t.email?.toLowerCase().includes(lowerSearch)
  );
  
  const filteredContracts = contracts.filter(c => {
    const ten = tenants.find(t => t.code === c.tenantCode);
    const apt = apartments.find(a => a.code === c.apartmentCode);
    return (
        c.code.toLowerCase().includes(lowerSearch) ||
        ten?.fullName.toLowerCase().includes(lowerSearch) ||
        apt?.name.toLowerCase().includes(lowerSearch)
    );
  });

  const getPayingContractLabel = () => {
      if(!viewingContract && !payingContract) return '';
      const c = viewingContract || payingContract;
      if(!c) return '';
      const apt = apartments.find(a => a.code === c.apartmentCode);
      const ten = tenants.find(t => t.code === c.tenantCode);
      return `${apt?.name || 'Unidad'} - ${ten?.fullName || 'Inquilino'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex gap-2"><Building className="text-brand-600"/> Bienes Raíces</h1>
        
        <div className="flex flex-wrap items-center gap-3">
            {activeTab !== 'PAYMENTS' && (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls" className="hidden" />
                <button onClick={handleDownloadTemplate} className="px-3 py-2 text-slate-600 hover:bg-slate-50 text-sm font-medium border-r border-slate-100" title="Descargar Plantilla"><FileSpreadsheet size={16}/></button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 text-sm font-medium disabled:opacity-50" title="Importar">
                    {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full"/> : <Upload size={16} />}
                </button>
                </div>
            )}
            
            <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>
            
            {activeTab !== 'PAYMENTS' && (
            <button 
                onClick={() => {
                    if(activeTab === 'PROPERTIES') { setEditingProp(null); setIsPropModalOpen(true); }
                    if(activeTab === 'UNITS') { setEditingApt(null); setIsAptModalOpen(true); }
                    if(activeTab === 'TENANTS') { setEditingTenant(null); setIsTenantModalOpen(true); }
                    if(activeTab === 'CONTRACTS') { setEditingContract(null); setIsContractModalOpen(true); }
                }} 
                className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 flex gap-2 items-center shadow-sm"
            >
                <Plus size={16}/> <span className="hidden sm:inline">Nuevo</span>
            </button>
            )}
        </div>
      </div>

      {/* SEARCH BAR & TABS CONTAINER */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* SEARCH BAR */}
        <div className="p-3 border-b border-slate-100 flex gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar propiedades, inquilinos, contratos..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200 transition-colors">
                <Filter size={18} />
            </button>
        </div>

        {/* TABS */}
        <div className="px-3 pt-2">
            <nav className="flex space-x-6 overflow-x-auto">
            {[
                { id: 'PROPERTIES', label: 'Edificios', icon: MapPin },
                { id: 'UNITS', label: 'Unidades', icon: Home },
                { id: 'TENANTS', label: 'Inquilinos', icon: Users },
                { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
                { id: 'PAYMENTS', label: 'Control de Pagos', icon: DollarSign },
            ].map((tab) => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`pb-3 flex items-center gap-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
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
                        <tbody>
                            {filteredProperties.map(p => (
                                <tr key={p.code} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="p-4"><div className="font-bold">{p.name}</div><div className="text-xs text-slate-400">{p.code}</div></td>
                                    <td className="p-4">{formatMoney(p.value)} {p.currency}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => {setEditingProp(p); setIsPropModalOpen(true)}} className="mr-2 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteProp(p.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredProperties.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No se encontraron propiedades</td></tr>}
                        </tbody>
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
                       {filteredUnits.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No se encontraron unidades</td></tr>}
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
                        {filteredTenants.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No se encontraron inquilinos</td></tr>}
                    </tbody>
                </table>
            </div>
            )}

            {activeTab === 'CONTRACTS' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-medium"><tr><th className="p-4">Contrato</th><th className="p-4">Unidad</th><th className="p-4">Inquilino</th><th className="p-4">Vigencia</th><th className="p-4 text-right">Acciones</th></tr></thead>
                    <tbody>
                        {filteredContracts.map(c => {
                            const apt = apartments.find(a => a.code === c.apartmentCode);
                            const ten = tenants.find(t => t.code === c.tenantCode);
                            let displayName = apt?.name;
                            if (!apt && (c as any).propertyCode) {
                                const legacyProp = properties.find(p => p.code === (c as any).propertyCode);
                                displayName = legacyProp?.name || 'Propiedad Antigua';
                            }
                            return (
                            <tr key={c.code} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-4"><div className="font-bold text-xs">{c.code}</div><span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded">ACTIVE</span></td>
                                <td className="p-4"><div className="font-medium">{displayName || c.apartmentCode || 'Sin Asignar'}</div></td>
                                <td className="p-4">{ten?.fullName || c.tenantCode}</td>
                                <td className="p-4 text-xs text-slate-500">{c.startDate} - {c.endDate}<div className="font-bold text-slate-700 mt-1">{formatMoney(c.amount)} (Día {c.paymentDay})</div></td>
                                <td className="p-4 text-right">
                                    <button onClick={() => { setEditingContract(c); setIsContractModalOpen(true); }} className="mr-2 text-slate-400 hover:text-brand-600"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteContract(c.code)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        )})}
                        {filteredContracts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No se encontraron contratos</td></tr>}
                    </tbody>
                </table>
            </div>
            )}

            {activeTab === 'PAYMENTS' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-indigo-800 font-bold"><CalendarIcon size={20} /> Calendario de Pagos</div>
                            <div className="text-xs text-indigo-600">Hoy: {new Date().toLocaleDateString()}</div>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 font-medium text-slate-500">
                                <tr>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4">Unidad / Inquilino</th>
                                    <th className="p-4 text-right">Próximo Pago</th>
                                    <th className="p-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContracts.map(c => {
                                    const apt = apartments.find(a => a.code === c.apartmentCode);
                                    const ten = tenants.find(t => t.code === c.tenantCode);
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const nextDate = new Date(c.nextPaymentDate || c.startDate);
                                    const isOverdue = today.getTime() > nextDate.getTime();
                                    
                                    return (
                                        <tr key={c.code} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isOverdue ? 'MORA' : 'AL DÍA'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{apt?.name || c.apartmentCode}</div>
                                                <div className="text-xs text-slate-500">{ten?.fullName || c.tenantCode}</div>
                                            </td>
                                            <td className="p-4 text-right font-mono">
                                                {new Date(c.nextPaymentDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => { setViewingContract(c); setIsHistoryModalOpen(true); }}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-xs font-bold"
                                                >
                                                    VER HISTORIAL
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredContracts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No se encontraron resultados</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      )}

      <PropertyModal isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} onSubmit={editingProp ? handleUpdateProp : handleCreateProp} editingProperty={editingProp} isSubmitting={isSubmitting} />
      <ApartmentModal isOpen={isAptModalOpen} onClose={() => setIsAptModalOpen(false)} onSubmit={editingApt ? handleUpdateApt : handleCreateApt} editingApartment={editingApt} isSubmitting={isSubmitting} />
      <TenantModal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} onSubmit={editingTenant ? handleUpdateTenant : handleCreateTenant} editingTenant={editingTenant} isSubmitting={isSubmitting} />
      <ContractModal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} onSubmit={editingContract ? handleUpdateContract : handleCreateContract} editingContract={editingContract} isSubmitting={isSubmitting} />
      
      <PaymentHistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        contract={viewingContract}
        contractLabel={getPayingContractLabel()}
        onRegisterPayment={handleInitiatePayment}
      />

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        onSubmit={handleRegisterPayment} 
        contract={payingContract}
        contractLabel={getPayingContractLabel()}
        initialDescription={paymentDescription}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default RealEstatePage;