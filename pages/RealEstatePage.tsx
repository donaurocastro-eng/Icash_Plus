import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Building, Home, Users, FileText, Zap, 
  DollarSign, Calendar, Clock, CheckCircle, TrendingUp, MoreVertical, Key,
  CreditCard, List, AlertTriangle, ArrowRight
} from 'lucide-react';
import { 
  Property, Apartment, Tenant, Contract, PropertyServiceItem, Transaction,
  PropertyFormData, ApartmentFormData, TenantFormData, ContractFormData, 
  PropertyServiceItemFormData, ServicePaymentFormData, PaymentFormData, BulkPaymentFormData 
} from '../types';
import { PropertyService } from '../services/propertyService';
import { ApartmentService } from '../services/apartmentService';
import { TenantService } from '../services/tenantService';
import { ContractService } from '../services/contractService';
import { ServiceItemService } from '../services/serviceItemService';
import { TransactionService } from '../services/transactionService';

import PropertyModal from '../components/PropertyModal';
import ApartmentModal from '../components/ApartmentModal';
import TenantModal from '../components/TenantModal';
import ContractModal from '../components/ContractModal';
import ServiceItemModal from '../components/ServiceItemModal';
import ServicePaymentModal from '../components/ServicePaymentModal';
import PaymentModal from '../components/PaymentModal';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import BulkPaymentModal from '../components/BulkPaymentModal';
import ContractPriceHistoryModal from '../components/ContractPriceHistoryModal';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'PAYMENTS' | 'DELINQUENT' | 'SERVICES'>('CONTRACTS');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [services, setServices] = useState<PropertyServiceItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Modals
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [showApartmentModal, setShowApartmentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

  const [showTenantModal, setShowTenantModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<PropertyServiceItem | null>(null);
  
  const [showServicePaymentModal, setShowServicePaymentModal] = useState(false);
  
  // Contract Actions Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
        const [props, apts, tens, conts, servs, txs] = await Promise.all([
            PropertyService.getAll(),
            ApartmentService.getAll(),
            TenantService.getAll(),
            ContractService.getAll(),
            ServiceItemService.getAll(),
            TransactionService.getAll()
        ]);
        setProperties(props);
        setApartments(apts);
        setTenants(tens);
        setContracts(conts);
        setServices(servs);
        setTransactions(txs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CRUD Handlers
  
  // ... Properties
  const handleCreateProperty = async (data: PropertyFormData) => {
      setIsSubmitting(true);
      try { await PropertyService.create(data); await loadData(); setShowPropertyModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleUpdateProperty = async (data: PropertyFormData) => {
      if(!selectedProperty) return;
      setIsSubmitting(true);
      try { await PropertyService.update(selectedProperty.code, data); await loadData(); setShowPropertyModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleDeleteProperty = async (code: string) => {
      if(!confirm("¿Eliminar propiedad?")) return;
      try { await PropertyService.delete(code); await loadData(); } catch(e: any) { alert(e.message); }
  };

  // ... Apartments
  const handleCreateApartment = async (data: ApartmentFormData) => {
      setIsSubmitting(true);
      try { await ApartmentService.create(data); await loadData(); setShowApartmentModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleUpdateApartment = async (data: ApartmentFormData) => {
      if(!selectedApartment) return;
      setIsSubmitting(true);
      try { await ApartmentService.update(selectedApartment.code, data); await loadData(); setShowApartmentModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleDeleteApartment = async (code: string) => {
      if(!confirm("¿Eliminar unidad?")) return;
      try { await ApartmentService.delete(code); await loadData(); } catch(e: any) { alert(e.message); }
  };

  // ... Tenants
  const handleCreateTenant = async (data: TenantFormData) => {
      setIsSubmitting(true);
      try { await TenantService.create(data); await loadData(); setShowTenantModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleUpdateTenant = async (data: TenantFormData) => {
      if(!selectedTenant) return;
      setIsSubmitting(true);
      try { await TenantService.update(selectedTenant.code, data); await loadData(); setShowTenantModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleDeleteTenant = async (code: string) => {
      if(!confirm("¿Eliminar inquilino?")) return;
      try { await TenantService.delete(code); await loadData(); } catch(e: any) { alert(e.message); }
  };

  // ... Contracts
  const handleCreateContract = async (data: ContractFormData) => {
      setIsSubmitting(true);
      try { await ContractService.create(data); await loadData(); setShowContractModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleUpdateContract = async (data: ContractFormData) => {
      if(!selectedContract) return;
      setIsSubmitting(true);
      try { await ContractService.update(selectedContract.code, data); await loadData(); setShowContractModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleDeleteContract = async (code: string) => {
      if(!confirm("¿Eliminar contrato?")) return;
      try { await ContractService.delete(code); await loadData(); } catch(e: any) { alert(e.message); }
  };

  // ... Contract Sub-actions
  const handleRegisterPayment = async (data: PaymentFormData) => {
      setIsSubmitting(true);
      try { 
          await ContractService.registerPayment(data); 
          await loadData(); 
          setShowPaymentModal(false); 
          alert("Registro guardado con éxito"); 
      }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleBulkPayment = async (data: BulkPaymentFormData) => {
      setIsSubmitting(true);
      try { 
          await ContractService.processBulkPayment(data); 
          await loadData(); 
          setShowBulkModal(false); 
          alert("Registro guardado con éxito"); 
      }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleDeleteContractTransaction = async (txCode: string) => {
      await TransactionService.delete(txCode);
  };
  const handleHistoryRegisterPayment = (date: Date) => {
      setShowHistoryModal(false);
      setShowPaymentModal(true);
  };

  // ... Services
  const handleCreateService = async (data: PropertyServiceItemFormData) => {
      setIsSubmitting(true);
      try { await ServiceItemService.create(data); await loadData(); setShowServiceModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleUpdateService = async (data: PropertyServiceItemFormData) => {
      if(!selectedService) return;
      setIsSubmitting(true);
      try { await ServiceItemService.update(selectedService.code, data); await loadData(); setShowServiceModal(false); }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const handleDeleteService = async (code: string) => {
      if(!confirm("¿Eliminar servicio?")) return;
      try { await ServiceItemService.delete(code); await loadData(); } catch(e: any) { alert(e.message); }
  };
  const handleServicePayment = async (data: ServicePaymentFormData) => {
      setIsSubmitting(true);
      try { 
          await ServiceItemService.registerPayment(data); 
          setShowServicePaymentModal(false); 
          alert("Registro guardado con éxito"); 
      }
      catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  // Helper
  const getContractLabel = (c: Contract) => {
      const t = tenants.find(x => x.code === c.tenantCode);
      const a = apartments.find(x => x.code === c.apartmentCode);
      return `${t?.fullName || c.tenantCode} - ${a?.name || c.apartmentCode}`;
  };

  // Derived Lists
  const rentTransactions = transactions.filter(t => t.type === 'INGRESO' && t.categoryCode?.includes('INC')).slice(0, 100);
  
  const delinquentContracts = contracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      if (!c.nextPaymentDate) return true;
      const today = new Date();
      const nextPay = new Date(c.nextPaymentDate);
      // Adjust timezone
      const nextPayAdjusted = new Date(nextPay.valueOf() + nextPay.getTimezoneOffset() * 60000);
      return nextPayAdjusted < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

  if(loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
      <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">Bienes Raíces</h1>
                  <p className="text-slate-500">Gestión de propiedades, alquileres y pagos.</p>
              </div>
              <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto max-w-full">
                   <button onClick={() => setActiveTab('PROPERTIES')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'PROPERTIES' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Propiedades</button>
                   <button onClick={() => setActiveTab('UNITS')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'UNITS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Unidades</button>
                   <button onClick={() => setActiveTab('TENANTS')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'TENANTS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Inquilinos</button>
                   <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
                   <button onClick={() => setActiveTab('CONTRACTS')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'CONTRACTS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Contratos</button>
                   <button onClick={() => setActiveTab('PAYMENTS')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'PAYMENTS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Control Pagos</button>
                   <button onClick={() => setActiveTab('DELINQUENT')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'DELINQUENT' ? 'bg-rose-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
                       En Mora 
                       {delinquentContracts.length > 0 && <span className="bg-white text-rose-600 text-[10px] px-1.5 rounded-full font-bold">{delinquentContracts.length}</span>}
                   </button>
                   <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
                   <button onClick={() => setActiveTab('SERVICES')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'SERVICES' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Servicios</button>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             
             {activeTab !== 'PAYMENTS' && activeTab !== 'DELINQUENT' && (
                 <button 
                    onClick={() => {
                        if (activeTab === 'PROPERTIES') { setSelectedProperty(null); setShowPropertyModal(true); }
                        if (activeTab === 'UNITS') { setSelectedApartment(null); setShowApartmentModal(true); }
                        if (activeTab === 'TENANTS') { setSelectedTenant(null); setShowTenantModal(true); }
                        if (activeTab === 'CONTRACTS') { setSelectedContract(null); setShowContractModal(true); }
                        if (activeTab === 'SERVICES') { setSelectedService(null); setShowServiceModal(true); }
                    }} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-md"
                 >
                    <Plus size={18}/> 
                    <span>
                        {activeTab === 'PROPERTIES' && 'Nueva Propiedad'}
                        {activeTab === 'UNITS' && 'Nueva Unidad'}
                        {activeTab === 'TENANTS' && 'Nuevo Inquilino'}
                        {activeTab === 'CONTRACTS' && 'Nuevo Contrato'}
                        {activeTab === 'SERVICES' && 'Nuevo Servicio'}
                    </span>
                 </button>
             )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             {/* PROPERTIES TAB */}
             {activeTab === 'PROPERTIES' && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Nombre / Código</th><th className="px-6 py-3">Catastro</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {properties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                                <tr key={p.code} className="hover:bg-slate-50">
                                    <td className="px-6 py-3"><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400 font-mono">{p.code}</div></td>
                                    <td className="px-6 py-3 text-slate-600">{p.cadastralKey || '-'}</td>
                                    <td className="px-6 py-3 text-right font-mono text-emerald-600 font-bold">{p.value.toLocaleString()} {p.currency}</td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => { setSelectedProperty(p); setShowPropertyModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteProperty(p.code)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}

             {/* UNITS TAB */}
             {activeTab === 'UNITS' && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Unidad</th><th className="px-6 py-3">Edificio / Propiedad</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {apartments.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(a => {
                                const prop = properties.find(p => p.code === a.propertyCode);
                                return (
                                    <tr key={a.code} className="hover:bg-slate-50">
                                        <td className="px-6 py-3"><div className="font-bold text-slate-800">{a.name}</div><div className="text-xs text-slate-400 font-mono">{a.code}</div></td>
                                        <td className="px-6 py-3 text-slate-600 flex items-center gap-2"><Building size={14}/> {prop?.name || a.propertyCode}</td>
                                        <td className="px-6 py-3 text-center">
                                            {a.status === 'AVAILABLE' && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">DISPONIBLE</span>}
                                            {a.status === 'RENTED' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">ALQUILADO</span>}
                                            {a.status === 'MAINTENANCE' && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">MANTENIMIENTO</span>}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => { setSelectedApartment(a); setShowApartmentModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteApartment(a.code)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
             )}

             {/* TENANTS TAB */}
             {activeTab === 'TENANTS' && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Inquilino</th><th className="px-6 py-3">Contacto</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {tenants.filter(t => t.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                                <tr key={t.code} className="hover:bg-slate-50">
                                    <td className="px-6 py-3"><div className="font-bold text-slate-800">{t.fullName}</div><div className="text-xs text-slate-400 font-mono">{t.code}</div></td>
                                    <td className="px-6 py-3 text-slate-600"><div className="text-xs">{t.phone}</div><div className="text-xs">{t.email}</div></td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => { setSelectedTenant(t); setShowTenantModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteTenant(t.code)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}

             {/* CONTRACTS TAB */}
             {activeTab === 'CONTRACTS' && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Inquilino / Unidad</th>
                                <th className="px-6 py-3">Vigencia</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                                <th className="px-6 py-3 text-center">Día Pago</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contracts.filter(c => getContractLabel(c).toLowerCase().includes(searchTerm.toLowerCase())).map(contract => {
                                const t = tenants.find(x => x.code === contract.tenantCode);
                                const a = apartments.find(x => x.code === contract.apartmentCode);
                                return (
                                    <tr key={contract.code} className="hover:bg-slate-50 group">
                                        <td className="px-6 py-3">
                                            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{contract.code}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                <span className="truncate max-w-[180px]">{t?.fullName || contract.tenantCode}</span>
                                                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{contract.tenantCode}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Home size={10} className="text-slate-400"/><span>{a?.name || contract.apartmentCode}</span></div>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-500">
                                            <div className="flex items-center gap-1"><Calendar size={10} className="text-emerald-500"/> {contract.startDate}</div>
                                            <div className="flex items-center gap-1 mt-1"><Calendar size={10} className="text-rose-400"/> {contract.endDate || 'Indefinido'}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">{contract.amount.toLocaleString('es-HN', {style:'currency', currency: 'HNL'})}</td>
                                        <td className="px-6 py-3 text-center"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold text-xs">Día {contract.paymentDay}</span></td>
                                        <td className="px-6 py-3 text-center"><span className={`px-2 py-1 rounded text-[10px] font-bold ${contract.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{contract.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}</span></td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setSelectedContract(contract); setShowPaymentModal(true); }} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded" title="Registrar Pago"><DollarSign size={16}/></button>
                                                <button onClick={() => { setSelectedContract(contract); setShowHistoryModal(true); }} className="p-1.5 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded" title="Historial"><Clock size={16}/></button>
                                                <button onClick={() => { setSelectedContract(contract); setShowBulkModal(true); }} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded" title="Cobro Masivo"><List size={16}/></button>
                                                <button onClick={() => { setSelectedContract(contract); setShowPriceHistoryModal(true); }} className="p-1.5 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded" title="Precios"><TrendingUp size={16}/></button>
                                                <button onClick={() => { setSelectedContract(contract); setShowContractModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteContract(contract.code)} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
             )}

             {/* PAYMENTS TAB (Control de Pagos) */}
             {activeTab === 'PAYMENTS' && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Inquilino</th>
                                <th className="px-6 py-3">Contrato / Unidad</th>
                                <th className="px-6 py-3">Descripción</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rentTransactions.filter(t => 
                                (t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (t.tenantName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                            ).map(tx => {
                                const contract = contracts.find(c => c.code === tx.contractCode);
                                return (
                                    <tr key={tx.code} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                                            {tx.date}
                                            <div className="text-[10px] text-slate-400">{tx.code}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {tx.tenantName ? (
                                                <div>
                                                    <span className="font-bold text-slate-700">{tx.tenantName}</span>
                                                    <span className="block text-[10px] text-slate-400 font-mono">{tx.tenantCode}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Desconocido</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {tx.contractCode && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">{tx.contractCode}</span>}
                                            {tx.propertyName && <span className="text-xs text-slate-600">{tx.propertyName}</span>}
                                        </td>
                                        <td className="px-6 py-3 text-slate-700 truncate max-w-xs">{tx.description}</td>
                                        <td className="px-6 py-3 text-right font-bold text-emerald-600">
                                            +{tx.amount.toLocaleString('es-HN', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                );
                            })}
                            {rentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        No se encontraron pagos recientes de alquiler.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
             )}

             {/* DELINQUENT TAB (En Mora) */}
             {activeTab === 'DELINQUENT' && (
                 <div className="overflow-x-auto">
                    {delinquentContracts.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32}/>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">¡Todo al día!</h3>
                            <p className="text-slate-500">No hay inquilinos con pagos atrasados.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-rose-50 text-rose-800 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Inquilino</th>
                                    <th className="px-6 py-3">Unidad / Contrato</th>
                                    <th className="px-6 py-3">Próximo Pago (Vencido)</th>
                                    <th className="px-6 py-3 text-right">Monto Pendiente</th>
                                    <th className="px-6 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {delinquentContracts.map(c => {
                                    const t = tenants.find(x => x.code === c.tenantCode);
                                    const a = apartments.find(x => x.code === c.apartmentCode);
                                    return (
                                        <tr key={c.code} className="hover:bg-slate-50">
                                            <td className="px-6 py-3">
                                                <div className="font-bold text-slate-800">{t?.fullName || c.tenantCode}</div>
                                                <div className="text-xs text-slate-400 font-mono bg-slate-100 px-1 rounded w-fit">{c.tenantCode}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="text-sm text-slate-700">{a?.name || c.apartmentCode}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{c.code}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2 text-rose-600 font-bold">
                                                    <AlertTriangle size={16}/>
                                                    {c.nextPaymentDate}
                                                </div>
                                                <span className="text-xs text-rose-400">Vencido</span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">
                                                {c.amount.toLocaleString('es-HN', {style: 'currency', currency: 'HNL'})}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button 
                                                    onClick={() => { setSelectedContract(c); setShowPaymentModal(true); }}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 mx-auto"
                                                >
                                                    <DollarSign size={14}/> Cobrar Ahora
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

             {/* SERVICES TAB */}
             {activeTab === 'SERVICES' && (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Servicio</th><th className="px-6 py-3">Propiedad</th><th className="px-6 py-3 text-right">Costo Est.</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
                                const prop = properties.find(p => p.code === s.propertyCode);
                                return (
                                    <tr key={s.code} className="hover:bg-slate-50">
                                        <td className="px-6 py-3"><div className="font-bold text-slate-800">{s.name}</div><div className="text-xs text-slate-400 font-mono">{s.code}</div></td>
                                        <td className="px-6 py-3 text-slate-600"><div className="flex items-center gap-2"><Building size={14}/> {prop?.name || s.propertyCode}</div></td>
                                        <td className="px-6 py-3 text-right font-mono text-slate-700">{s.defaultAmount.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.active ? 'ACTIVO' : 'INACTIVO'}</span></td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setSelectedService(s); setShowServicePaymentModal(true); }} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded" title="Pagar Servicio"><CreditCard size={16}/></button>
                                                <button onClick={() => { setSelectedService(s); setShowServiceModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteService(s.code)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
             )}
          </div>

          {/* Modals */}
          <PropertyModal isOpen={showPropertyModal} onClose={() => setShowPropertyModal(false)} onSubmit={selectedProperty ? handleUpdateProperty : handleCreateProperty} editingProperty={selectedProperty} isSubmitting={isSubmitting} />
          <ApartmentModal isOpen={showApartmentModal} onClose={() => setShowApartmentModal(false)} onSubmit={selectedApartment ? handleUpdateApartment : handleCreateApartment} editingApartment={selectedApartment} isSubmitting={isSubmitting} />
          <TenantModal isOpen={showTenantModal} onClose={() => setShowTenantModal(false)} onSubmit={selectedTenant ? handleUpdateTenant : handleCreateTenant} editingTenant={selectedTenant} isSubmitting={isSubmitting} />
          <ContractModal isOpen={showContractModal} onClose={() => setShowContractModal(false)} onSubmit={selectedContract ? handleUpdateContract : handleCreateContract} editingContract={selectedContract} isSubmitting={isSubmitting} />
          <ServiceItemModal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} onSubmit={selectedService ? handleUpdateService : handleCreateService} editingItem={selectedService} isSubmitting={isSubmitting} />
          
          <ServicePaymentModal isOpen={showServicePaymentModal} onClose={() => setShowServicePaymentModal(false)} onSubmit={handleServicePayment} serviceItem={selectedService} isSubmitting={isSubmitting} />
          
          <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSubmit={handleRegisterPayment} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} initialDescription={selectedContract ? `Alquiler ${new Date().toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}` : ''} isSubmitting={isSubmitting} />
          
          <PaymentHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} tenantName={tenants.find(t => t.code === selectedContract?.tenantCode)?.fullName} unitName={apartments.find(a => a.code === selectedContract?.apartmentCode)?.name} onRegisterPayment={handleHistoryRegisterPayment} onDeleteTransaction={handleDeleteContractTransaction} />
          
          <BulkPaymentModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSubmit={handleBulkPayment} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} isSubmitting={isSubmitting} />
          
          <ContractPriceHistoryModal isOpen={showPriceHistoryModal} onClose={() => setShowPriceHistoryModal(false)} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} />
      </div>
  );
};

export default RealEstatePage;