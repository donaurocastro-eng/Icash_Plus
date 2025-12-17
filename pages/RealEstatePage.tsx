import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Building, Home, Users, FileText, Zap, 
  DollarSign, Calendar, Clock, CheckCircle, TrendingUp, MoreVertical, Key,
  CreditCard, List, AlertTriangle, ArrowRight, User, Loader, X, Filter
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
  const [contractFilter, setContractFilter] = useState<'ALL' | 'ACTIVE' | 'FINISHED'>('ALL');

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
  const [paymentModalDesc, setPaymentModalDesc] = useState(''); 
  const [paymentModalOverrides, setPaymentModalOverrides] = useState<{amount?: number, date?: Date}>({});

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);

  // Delete Confirmation States (Tenants)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const handleConfirmDeleteTenant = async () => {
      if(!tenantToDelete) return;
      setIsDeleting(true);
      try { 
          await TenantService.delete(tenantToDelete.code); 
          await loadData(); 
          setTenantToDelete(null);
          setTimeout(() => alert("✅ Inquilino eliminado correctamente."), 100);
      } catch(e: any) { 
          alert(`Error: ${e.message}`); 
      } finally { 
          setIsDeleting(false); 
      }
  };

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

  const handleOpenPaymentModal = (contract: Contract, specificDate?: Date) => {
      setSelectedContract(contract);
      if (!specificDate) { setPaymentModalOverrides({}); }
      const t = tenants.find(x => x.code === contract.tenantCode);
      const tenantName = t ? t.fullName : 'Inquilino';
      let targetDate = specificDate || new Date(contract.nextPaymentDate || new Date());
      if (!specificDate && contract.nextPaymentDate) {
          const dateStr = contract.nextPaymentDate.length >= 10 ? contract.nextPaymentDate.substring(0, 10) : new Date().toISOString().split('T')[0];
          targetDate = new Date(dateStr);
          targetDate = new Date(targetDate.valueOf() + targetDate.getTimezoneOffset() * 60000);
      }
      const monthName = targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const desc = `Contrato: ${contract.code} Inquilino: ${contract.tenantCode} ${tenantName} - Alquiler ${label}`;
      setPaymentModalDesc(desc);
      setShowPaymentModal(true);
  };

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
      setBulkProgress('');
      try { 
          await ContractService.processBulkPayment(data, (cur, tot) => {
              setBulkProgress(`${cur}/${tot}`);
          }); 
          await loadData(); 
          setShowBulkModal(false); 
          alert("Procesamiento masivo completado con éxito"); 
      }
      catch (e: any) { alert(e.message); } finally { 
          setIsSubmitting(false); 
          setBulkProgress('');
      }
  };
  const handleDeleteContractTransaction = async (txCode: string) => {
      await TransactionService.delete(txCode);
  };
  
  const handleHistoryRegisterPayment = (date: Date, amount?: number) => {
      setShowHistoryModal(false);
      if (selectedContract) {
          setPaymentModalOverrides({ date, amount });
          handleOpenPaymentModal(selectedContract, date);
      }
  };

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

  const formatDateDisplay = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
  };

  const getContractLabel = (c: Contract) => {
      const t = tenants.find(x => x.code === c.tenantCode);
      const a = apartments.find(x => x.code === c.apartmentCode);
      return `${t?.fullName || c.tenantCode} - ${a?.name || c.apartmentCode}`;
  };

  const activeContractsList = contracts.filter(c => c.status === 'ACTIVE');
  const delinquentContracts = contracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      if (!c.nextPaymentDate) return true;
      const today = new Date();
      const nextPay = new Date(c.nextPaymentDate);
      const nextPayAdjusted = new Date(nextPay.valueOf() + nextPay.getTimezoneOffset() * 60000);
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (c.endDate) {
          const endObj = new Date(c.endDate);
          const endAdjusted = new Date(endObj.valueOf() + endObj.getTimezoneOffset() * 60000);
          if (nextPayAdjusted > endAdjusted) return false;
      }

      return nextPayAdjusted < todayZero;
  });

  if(loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
      <div className="space-y-6 relative">
          {tenantToDelete && (
              <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setTenantToDelete(null)} />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-fadeIn">
                      <div className="flex flex-col items-center text-center space-y-4">
                          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                              {isDeleting ? <Loader size={32} className="animate-spin"/> : <Trash2 size={32}/>}
                          </div>
                          <h3 className="text-xl font-bold text-slate-800">
                              {isDeleting ? 'Eliminando...' : '¿Eliminar Inquilino?'}
                          </h3>
                          {!isDeleting && (
                              <div className="text-sm text-slate-600">
                                  <p className="mb-2">Vas a eliminar a: <strong>{tenantToDelete.fullName}</strong></p>
                                  <p className="text-xs bg-amber-50 border border-amber-100 text-amber-800 p-2 rounded">
                                      Esto no borrará su historial de pagos, pero desaparecerá de la lista de activos.
                                  </p>
                              </div>
                          )}
                          <div className="flex gap-3 w-full pt-2">
                              <button onClick={() => setTenantToDelete(null)} disabled={isDeleting} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50">Cancelar</button>
                              <button onClick={handleConfirmDeleteTenant} disabled={isDeleting} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-md disabled:opacity-50 flex justify-center items-center gap-2">
                                  {isDeleting ? 'Procesando...' : 'Sí, Eliminar'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

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
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                {activeTab === 'CONTRACTS' && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 w-full sm:w-auto">
                        <Filter size={14} className="text-slate-400 ml-2" />
                        <select 
                            className="bg-transparent text-xs font-bold text-slate-600 outline-none py-1 pr-2"
                            value={contractFilter}
                            onChange={(e) => setContractFilter(e.target.value as any)}
                        >
                            <option value="ALL">Todos los Contratos</option>
                            <option value="ACTIVE">Solo Activos</option>
                            <option value="FINISHED">Solo Finalizados</option>
                        </select>
                    </div>
                )}
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-md w-full sm:w-auto justify-center"
                 >
                    <Plus size={18}/> 
                    <span className="text-sm">
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
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-50'}`}>{t.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => { setSelectedTenant(t); setShowTenantModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                        <button onClick={() => setTenantToDelete(t)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}
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
                            {contracts
                                .filter(c => getContractLabel(c).toLowerCase().includes(searchTerm.toLowerCase()))
                                .filter(c => {
                                    if (contractFilter === 'ALL') return true;
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    const endObj = c.endDate ? new Date(c.endDate) : null;
                                    const isFinished = endObj ? (new Date(endObj.valueOf() + endObj.getTimezoneOffset() * 60000) < today) : false;
                                    return contractFilter === 'ACTIVE' ? !isFinished : isFinished;
                                })
                                .map(contract => {
                                const t = tenants.find(x => x.code === contract.tenantCode);
                                const a = apartments.find(x => x.code === contract.apartmentCode);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const endObj = contract.endDate ? new Date(contract.endDate) : null;
                                
                                let isTemporallyExpired = false;
                                if (endObj) {
                                    const endAdjusted = new Date(endObj.valueOf() + endObj.getTimezoneOffset() * 60000);
                                    isTemporallyExpired = endAdjusted < today;
                                }

                                const nextPay = new Date(contract.nextPaymentDate || contract.startDate);
                                const nextPayAdjusted = new Date(nextPay.valueOf() + nextPay.getTimezoneOffset() * 60000);
                                
                                // Un contrato está realmente finalizado y pagado si la fecha de próximo pago supera el fin del contrato.
                                let isFullyPaidAndFinished = false;
                                if (endObj) {
                                    const endAdjusted = new Date(endObj.valueOf() + endObj.getTimezoneOffset() * 60000);
                                    if (nextPayAdjusted > endAdjusted) isFullyPaidAndFinished = true;
                                }

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
                                            <div className="flex items-center gap-1"><Calendar size={10} className="text-emerald-500"/> {formatDateDisplay(contract.startDate)}</div>
                                            <div className="flex items-center gap-1 mt-1"><Calendar size={10} className="text-rose-400"/> {contract.endDate ? formatDateDisplay(contract.endDate) : 'Indefinido'}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">{contract.amount.toLocaleString('es-HN', {style:'currency', currency: 'HNL'})}</td>
                                        <td className="px-6 py-3 text-center"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold text-xs">Día {contract.paymentDay}</span></td>
                                        <td className="px-6 py-3 text-center">
                                            {isTemporallyExpired ? (
                                                isFullyPaidAndFinished ? (
                                                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">Finalizado</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">Vencido</span>
                                                )
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${contract.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{contract.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setSelectedContract(contract); setShowHistoryModal(true); }} className="p-1.5 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded" title="Historial"><Clock size={16}/></button>
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
             {activeTab === 'PAYMENTS' && (
                 <div>
                    <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-indigo-900">Control de Alquileres</h3>
                            <p className="text-xs text-indigo-700">Gestión de cobros y estados de cuenta</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Inquilino</th>
                                    <th className="px-6 py-3">Unidad / Propiedad</th>
                                    <th className="px-6 py-3">Próximo Pago</th>
                                    <th className="px-6 py-3 text-right">Monto</th>
                                    <th className="px-6 py-3 text-center">Estado</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeContractsList.filter(c => getContractLabel(c).toLowerCase().includes(searchTerm.toLowerCase())).map(contract => {
                                    const t = tenants.find(x => x.code === contract.tenantCode);
                                    const a = apartments.find(x => x.code === contract.apartmentCode);
                                    const today = new Date();
                                    const nextPay = new Date(contract.nextPaymentDate || contract.startDate);
                                    const nextPayAdjusted = new Date(nextPay.valueOf() + nextPay.getTimezoneOffset() * 60000);
                                    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                    
                                    let isOverdue = nextPayAdjusted < todayZero;
                                    if (contract.endDate) {
                                        const endObj = new Date(contract.endDate);
                                        const endAdjusted = new Date(endObj.valueOf() + endObj.getTimezoneOffset() * 60000);
                                        if (nextPayAdjusted > endAdjusted) isOverdue = false;
                                    }

                                    return (
                                        <tr key={contract.code} className="hover:bg-slate-50 group">
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                                        <User size={14} className="text-slate-400"/>
                                                        {t?.fullName || 'Desconocido'}
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1 border border-slate-200">
                                                        {contract.tenantCode}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="text-sm text-slate-700 font-medium">{a?.name || contract.apartmentCode}</div>
                                                <div className="text-[10px] text-slate-400">{contract.code}</div>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                                                {formatDateDisplay(contract.nextPaymentDate)}
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-700">
                                                {contract.amount.toLocaleString('es-HN', {style:'currency', currency: 'HNL'})}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {isOverdue ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                                        <AlertTriangle size={10}/> Vencido
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                                        <CheckCircle size={10}/> Al día
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenPaymentModal(contract)} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1">
                                                        <DollarSign size={14}/> Pago
                                                    </button>
                                                    <button onClick={() => { setSelectedContract(contract); setShowBulkModal(true); }} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1">
                                                        <List size={14}/> Masivo
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                 </div>
             )}
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
                                                    {formatDateDisplay(c.nextPaymentDate)}
                                                </div>
                                                <span className="text-xs text-rose-400">Vencido</span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">
                                                {c.amount.toLocaleString('es-HN', {style: 'currency', currency: 'HNL'})}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => handleOpenPaymentModal(c)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 mx-auto">
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

          <PropertyModal isOpen={showPropertyModal} onClose={() => setShowPropertyModal(false)} onSubmit={selectedProperty ? handleUpdateProperty : handleCreateProperty} editingProperty={selectedProperty} isSubmitting={isSubmitting} />
          <ApartmentModal isOpen={showApartmentModal} onClose={() => setShowApartmentModal(false)} onSubmit={selectedApartment ? handleUpdateApartment : handleCreateApartment} editingApartment={selectedApartment} isSubmitting={isSubmitting} />
          <TenantModal isOpen={showTenantModal} onClose={() => setShowTenantModal(false)} onSubmit={selectedTenant ? handleUpdateTenant : handleCreateTenant} editingTenant={selectedTenant} isSubmitting={isSubmitting} />
          <ContractModal isOpen={showContractModal} onClose={() => setShowContractModal(false)} onSubmit={selectedContract ? handleUpdateContract : handleCreateContract} editingContract={selectedContract} isSubmitting={isSubmitting} />
          <ServiceItemModal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} onSubmit={selectedService ? handleUpdateService : handleCreateService} editingItem={selectedService} isSubmitting={isSubmitting} />
          <ServicePaymentModal isOpen={showServicePaymentModal} onClose={() => setShowServicePaymentModal(false)} onSubmit={handleServicePayment} serviceItem={selectedService} isSubmitting={isSubmitting} />
          <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSubmit={handleRegisterPayment} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} initialDescription={paymentModalDesc} initialAmount={paymentModalOverrides.amount} initialDate={paymentModalOverrides.date} isSubmitting={isSubmitting} />
          <PaymentHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} tenantName={tenants.find(t => t.code === selectedContract?.tenantCode)?.fullName} unitName={apartments.find(a => a.code === selectedContract?.apartmentCode)?.name} onRegisterPayment={handleHistoryRegisterPayment} onDeleteTransaction={handleDeleteContractTransaction} />
          <BulkPaymentModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSubmit={handleBulkPayment} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} isSubmitting={isSubmitting} progressText={bulkProgress} />
          <ContractPriceHistoryModal isOpen={showPriceHistoryModal} onClose={() => setShowPriceHistoryModal(false)} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} />
      </div>
  );
};

export default RealEstatePage;