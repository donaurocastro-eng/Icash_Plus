import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Building, Home, Users, FileText, Zap, 
  DollarSign, Calendar, Clock, CheckCircle, TrendingUp, MoreVertical, Key,
  CreditCard, List, AlertTriangle, ArrowRight, User, Loader, X, Filter, RefreshCw
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
import ServicePaymentHistoryModal from '../components/ServicePaymentHistoryModal';
import PaymentModal from '../components/PaymentModal';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import BulkPaymentModal from '../components/BulkPaymentModal';

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
  const [showServiceHistoryModal, setShowServiceHistoryModal] = useState(false);
  const [suggestedServiceDate, setSuggestedServiceDate] = useState<string | undefined>(undefined);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalDate, setPaymentModalDate] = useState<Date | undefined>(undefined);
  const [paymentModalAmount, setPaymentModalAmount] = useState<number | undefined>(undefined);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  // Delete Confirmation States
  const [itemToDelete, setItemToDelete] = useState<{type: string, code: string, label: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabLabels: Record<string, string> = {
    PROPERTIES: 'PROPIEDADES',
    UNITS: 'UNIDADES',
    TENANTS: 'INQUILINOS',
    CONTRACTS: 'CONTRATOS',
    PAYMENTS: 'PAGOS RÁPIDOS',
    DELINQUENT: 'MOROSIDAD',
    SERVICES: 'SERVICIOS'
  };

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
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleUpdateProperty = async (data: PropertyFormData) => {
      if(!selectedProperty) return;
      setIsSubmitting(true);
      try { await PropertyService.update(selectedProperty.code, data); await loadData(); setShowPropertyModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleCreateApartment = async (data: ApartmentFormData) => {
      setIsSubmitting(true);
      try { await ApartmentService.create(data); await loadData(); setShowApartmentModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleUpdateApartment = async (data: ApartmentFormData) => {
      if(!selectedApartment) return;
      setIsSubmitting(true);
      try { await ApartmentService.update(selectedApartment.code, data); await loadData(); setShowApartmentModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleCreateTenant = async (data: TenantFormData) => {
      setIsSubmitting(true);
      try { await TenantService.create(data); await loadData(); setShowTenantModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleUpdateTenant = async (data: TenantFormData) => {
      if(!selectedTenant) return;
      setIsSubmitting(true);
      try { await TenantService.update(selectedTenant.code, data); await loadData(); setShowTenantModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleCreateContract = async (data: ContractFormData) => {
      setIsSubmitting(true);
      try { await ContractService.create(data); await loadData(); setShowContractModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleUpdateContract = async (data: ContractFormData) => {
      if(!selectedContract) return;
      setIsSubmitting(true);
      try { await ContractService.update(selectedContract.code, data); await loadData(); setShowContractModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
        if (itemToDelete.type === 'PROPERTY') await PropertyService.delete(itemToDelete.code);
        else if (itemToDelete.type === 'APARTMENT') await ApartmentService.delete(itemToDelete.code);
        else if (itemToDelete.type === 'TENANT') await TenantService.delete(itemToDelete.code);
        else if (itemToDelete.type === 'CONTRACT') await ContractService.delete(itemToDelete.code);
        else if (itemToDelete.type === 'SERVICE') await ServiceItemService.delete(itemToDelete.code);
        await loadData();
        setItemToDelete(null);
    } catch (e: any) { console.error(e); } finally { setIsDeleting(false); }
  };

  const handleRegisterPayment = async (data: PaymentFormData) => {
      setIsSubmitting(true);
      try { await ContractService.registerPayment(data); await loadData(); setShowPaymentModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };
  
  const handleBulkPayment = async (data: BulkPaymentFormData) => {
      setIsSubmitting(true);
      try { await ContractService.processBulkPayment(data, (cur, tot) => setBulkProgress(`${cur}/${tot}`)); await loadData(); setShowBulkModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); setBulkProgress(''); }
  };

  const handleCreateService = async (data: PropertyServiceItemFormData) => {
      setIsSubmitting(true);
      try { await ServiceItemService.create(data); await loadData(); setShowServiceModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleUpdateService = async (data: PropertyServiceItemFormData) => {
      if(!selectedService) return;
      setIsSubmitting(true);
      try { await ServiceItemService.update(selectedService.code, data); await loadData(); setShowServiceModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleServicePayment = async (data: ServicePaymentFormData) => {
      setIsSubmitting(true);
      try { await ServiceItemService.registerPayment(data); await loadData(); setShowServicePaymentModal(false); }
      catch (e: any) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleDeleteTransaction = async (code: string) => {
      try {
          await TransactionService.delete(code);
          await loadData();
      } catch (e) { console.error(e); }
  };

  if(loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div></div>;

  return (
      <div className="space-y-6 relative">
          {itemToDelete && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setItemToDelete(null)} />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden p-6 animate-fadeIn">
                      <div className="flex flex-col items-center text-center space-y-4">
                          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                              {isDeleting ? <Loader size={32} className="animate-spin"/> : <Trash2 size={32}/>}
                          </div>
                          <h3 className="text-xl font-bold text-slate-800">¿Confirmas eliminar?</h3>
                          <p className="text-sm text-slate-600">Eliminarás el registro: <strong>{itemToDelete.label}</strong></p>
                          <div className="flex gap-3 w-full pt-2">
                              <button onClick={() => setItemToDelete(null)} disabled={isDeleting} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">Cancelar</button>
                              <button onClick={handleExecuteDelete} disabled={isDeleting} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold">Sí, Borrar</button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">Bienes Raíces</h1>
                  <p className="text-slate-500">Gestión de inmuebles y cobros.</p>
              </div>
              <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm overflow-x-auto">
                   {['PROPERTIES', 'UNITS', 'TENANTS', 'CONTRACTS', 'PAYMENTS', 'DELINQUENT', 'SERVICES'].map(tab => (
                       <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
                           {tabLabels[tab]}
                       </button>
                   ))}
              </div>
          </div>

          <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             {activeTab !== 'PAYMENTS' && activeTab !== 'DELINQUENT' && (
                 <button onClick={() => {
                        if (activeTab === 'PROPERTIES') { setSelectedProperty(null); setShowPropertyModal(true); }
                        else if (activeTab === 'UNITS') { setSelectedApartment(null); setShowApartmentModal(true); }
                        else if (activeTab === 'TENANTS') { setSelectedTenant(null); setShowTenantModal(true); }
                        else if (activeTab === 'CONTRACTS') { setSelectedContract(null); setShowContractModal(true); }
                        else if (activeTab === 'SERVICES') { setSelectedService(null); setShowServiceModal(true); }
                    }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-md">
                    <Plus size={18}/> Nueva Entrada
                 </button>
             )}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[300px]">
             {activeTab === 'PROPERTIES' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {properties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                            <tr key={p.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold">{p.name}</td>
                                <td className="px-6 py-3 text-right">{p.value.toLocaleString()} {p.currency}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { setSelectedProperty(p); setShowPropertyModal(true); }} className="p-1.5 text-slate-400"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'PROPERTY', code:p.code, label:p.name})} className="p-1.5 text-slate-400"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'UNITS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3">Unidad</th><th className="px-6 py-3">Propiedad</th><th className="px-6 py-3">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {apartments.map(a => (
                            <tr key={a.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold">{a.name}</td>
                                <td className="px-6 py-3">{properties.find(p => p.code === a.propertyCode)?.name || a.propertyCode}</td>
                                <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status === 'RENTED' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.status}</span></td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { setSelectedApartment(a); setShowApartmentModal(true); }} className="p-1.5 text-slate-400"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'APARTMENT', code:a.code, label:a.name})} className="p-1.5 text-slate-400"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'TENANTS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3">Inquilino</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {tenants.filter(t => t.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                            <tr key={t.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold">{t.fullName}</td>
                                <td className="px-6 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>ACTIVO</span></td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { setSelectedTenant(t); setShowTenantModal(true); }} className="p-1.5 text-slate-400"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'TENANT', code:t.code, label:t.fullName})} className="p-1.5 text-slate-400"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'CONTRACTS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3">Código</th><th className="px-6 py-3">Inquilino</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {contracts.map(c => (
                            <tr key={c.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold">{c.code}</td>
                                <td className="px-6 py-3">{tenants.find(t => t.code === c.tenantCode)?.fullName || c.tenantCode}</td>
                                <td className="px-6 py-3 text-right">{c.amount.toLocaleString()}</td>
                                <td className="px-6 py-3 text-right flex justify-end gap-1">
                                    <button onClick={() => { setSelectedContract(c); setShowHistoryModal(true); }} title="Historial" className="p-1.5 text-slate-400 hover:text-indigo-600"><Clock size={16}/></button>
                                    <button onClick={() => { setSelectedContract(c); setShowContractModal(true); }} className="p-1.5 text-slate-400"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'CONTRACT', code:c.code, label:c.code})} className="p-1.5 text-slate-400"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'SERVICES' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3">Servicio</th><th className="px-6 py-3">Propiedad</th><th className="px-6 py-3 text-right">Monto Est.</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {services.map(s => (
                            <tr key={s.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold">{s.name}</td>
                                <td className="px-6 py-3">{properties.find(p => p.code === s.propertyCode)?.name || s.propertyCode}</td>
                                <td className="px-6 py-3 text-right">{s.defaultAmount.toLocaleString()} HNL</td>
                                <td className="px-6 py-3 text-right flex justify-end gap-2">
                                    <button onClick={() => { setSelectedService(s); setShowServiceHistoryModal(true); }} title="Ver Historial" className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">Historial</button>
                                    <button onClick={() => { setSelectedService(s); setShowServicePaymentModal(true); }} className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-bold">Pagar</button>
                                    <button onClick={() => { setSelectedService(s); setShowServiceModal(true); }} className="p-1 text-slate-400"><Edit2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {(activeTab === 'PAYMENTS' || activeTab === 'DELINQUENT') && (
                 <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <AlertTriangle size={48} className="mb-4 opacity-20"/>
                    <p className="font-medium text-lg">Módulo en Desarrollo</p>
                    <p className="text-sm">Esta vista estará disponible en la próxima actualización.</p>
                 </div>
             )}
          </div>

          <PropertyModal isOpen={showPropertyModal} onClose={() => setShowPropertyModal(false)} onSubmit={selectedProperty ? handleUpdateProperty : handleCreateProperty} editingProperty={selectedProperty} isSubmitting={isSubmitting} />
          <ApartmentModal isOpen={showApartmentModal} onClose={() => setShowApartmentModal(false)} onSubmit={selectedApartment ? handleUpdateApartment : handleCreateApartment} editingApartment={selectedApartment} isSubmitting={isSubmitting} />
          <TenantModal isOpen={showTenantModal} onClose={() => setShowTenantModal(false)} onSubmit={selectedTenant ? handleUpdateTenant : handleCreateTenant} editingTenant={selectedTenant} isSubmitting={isSubmitting} />
          <ContractModal isOpen={showContractModal} onClose={() => setShowContractModal(false)} onSubmit={selectedContract ? handleUpdateContract : handleCreateContract} editingContract={selectedContract} isSubmitting={isSubmitting} />
          <ServiceItemModal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} onSubmit={selectedService ? handleUpdateService : handleCreateService} editingItem={selectedService} isSubmitting={isSubmitting} />
          
          <ServicePaymentModal isOpen={showServicePaymentModal} onClose={() => setShowServicePaymentModal(false)} onSubmit={handleServicePayment} serviceItem={selectedService} isSubmitting={isSubmitting} initialDate={suggestedServiceDate} />
          <ServicePaymentHistoryModal isOpen={showServiceHistoryModal} onClose={() => setShowServiceHistoryModal(false)} service={selectedService} propertyName={properties.find(p => p.code === selectedService?.propertyCode)?.name || ""} onAddPayment={(d) => { setSuggestedServiceDate(d); setShowServicePaymentModal(true); }} onDeleteTransaction={handleDeleteTransaction} />
          
          <PaymentModal 
            isOpen={showPaymentModal} 
            onClose={() => setShowPaymentModal(false)} 
            onSubmit={handleRegisterPayment} 
            contract={selectedContract} 
            contractLabel={selectedContract?.code || ""} 
            initialDescription={selectedContract ? `Pago Alquiler - ${tenants.find(t => t.code === selectedContract.tenantCode)?.fullName}` : ""} 
            initialDate={paymentModalDate}
            initialAmount={paymentModalAmount}
            isSubmitting={isSubmitting} 
          />
          <PaymentHistoryModal 
            isOpen={showHistoryModal} 
            onClose={() => setShowHistoryModal(false)} 
            contract={selectedContract} 
            contractLabel={selectedContract?.code || ""} 
            tenantName={tenants.find(t => t.code === selectedContract?.tenantCode)?.fullName || ""} 
            onRegisterPayment={(monthDate, amount) => { 
                setPaymentModalDate(monthDate);
                setPaymentModalAmount(amount);
                setShowPaymentModal(true); 
            }} 
            onDeleteTransaction={handleDeleteTransaction} 
          />
          <BulkPaymentModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSubmit={handleBulkPayment} contract={selectedContract} contractLabel={selectedContract?.code || ""} isSubmitting={isSubmitting} progressText={bulkProgress} />
      </div>
  );
};

export default RealEstatePage;