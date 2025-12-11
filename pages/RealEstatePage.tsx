import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Building, Home, Users, FileText, Zap, 
  DollarSign, Calendar, Clock, CheckCircle, TrendingUp, MoreVertical, Key,
  CreditCard, List, AlertTriangle, ArrowRight, User, Loader, X, PieChart
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
  const [paymentModalDesc, setPaymentModalDesc] = useState(''); 

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
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

  // CRUD Handlers...
  const handleCreateProperty = async (data: PropertyFormData) => { setIsSubmitting(true); try { await PropertyService.create(data); await loadData(); setShowPropertyModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleUpdateProperty = async (data: PropertyFormData) => { if(!selectedProperty) return; setIsSubmitting(true); try { await PropertyService.update(selectedProperty.code, data); await loadData(); setShowPropertyModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleDeleteProperty = async (code: string) => { if(!confirm("¿Eliminar propiedad?")) return; try { await PropertyService.delete(code); await loadData(); } catch(e: any) { alert(e.message); } };

  const handleCreateApartment = async (data: ApartmentFormData) => { setIsSubmitting(true); try { await ApartmentService.create(data); await loadData(); setShowApartmentModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleUpdateApartment = async (data: ApartmentFormData) => { if(!selectedApartment) return; setIsSubmitting(true); try { await ApartmentService.update(selectedApartment.code, data); await loadData(); setShowApartmentModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleDeleteApartment = async (code: string) => { if(!confirm("¿Eliminar unidad?")) return; try { await ApartmentService.delete(code); await loadData(); } catch(e: any) { alert(e.message); } };

  const handleCreateTenant = async (data: TenantFormData) => { setIsSubmitting(true); try { await TenantService.create(data); await loadData(); setShowTenantModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleUpdateTenant = async (data: TenantFormData) => { if(!selectedTenant) return; setIsSubmitting(true); try { await TenantService.update(selectedTenant.code, data); await loadData(); setShowTenantModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleConfirmDeleteTenant = async () => { if(!tenantToDelete) return; setIsDeleting(true); try { await TenantService.delete(tenantToDelete.code); await loadData(); setTenantToDelete(null); setTimeout(() => alert("✅ Inquilino eliminado correctamente."), 100); } catch(e: any) { alert(`Error: ${e.message}`); } finally { setIsDeleting(false); } };

  const handleCreateContract = async (data: ContractFormData) => { setIsSubmitting(true); try { await ContractService.create(data); await loadData(); setShowContractModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleUpdateContract = async (data: ContractFormData) => { if(!selectedContract) return; setIsSubmitting(true); try { await ContractService.update(selectedContract.code, data); await loadData(); setShowContractModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleDeleteContract = async (code: string) => { if(!confirm("¿Eliminar contrato?")) return; try { await ContractService.delete(code); await loadData(); } catch(e: any) { alert(e.message); } };

  const handleOpenPaymentModal = (contract: Contract) => {
      setSelectedContract(contract);
      const t = tenants.find(x => x.code === contract.tenantCode);
      const tenantName = t ? t.fullName : 'Inquilino';
      let nextDate = new Date(contract.nextPaymentDate || new Date());
      nextDate = new Date(nextDate.valueOf() + nextDate.getTimezoneOffset() * 60000);
      const monthName = nextDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const desc = `Contrato: ${contract.code} Inquilino: ${contract.tenantCode} ${tenantName} - Alquiler ${label}`;
      setPaymentModalDesc(desc);
      setShowPaymentModal(true);
  };

  const handleRegisterPayment = async (data: PaymentFormData) => { setIsSubmitting(true); try { await ContractService.registerPayment(data); await loadData(); setShowPaymentModal(false); alert("Registro guardado con éxito"); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleBulkPayment = async (data: BulkPaymentFormData) => { setIsSubmitting(true); try { await ContractService.processBulkPayment(data); await loadData(); setShowBulkModal(false); alert("Registro guardado con éxito"); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleDeleteContractTransaction = async (txCode: string) => { await TransactionService.delete(txCode); };
  const handleHistoryRegisterPayment = (date: Date) => { setShowHistoryModal(false); if (selectedContract) handleOpenPaymentModal(selectedContract); };

  const handleCreateService = async (data: PropertyServiceItemFormData) => { setIsSubmitting(true); try { await ServiceItemService.create(data); await loadData(); setShowServiceModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleUpdateService = async (data: PropertyServiceItemFormData) => { if(!selectedService) return; setIsSubmitting(true); try { await ServiceItemService.update(selectedService.code, data); await loadData(); setShowServiceModal(false); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };
  const handleDeleteService = async (code: string) => { if(!confirm("¿Eliminar servicio?")) return; try { await ServiceItemService.delete(code); await loadData(); } catch(e: any) { alert(e.message); } };
  const handleServicePayment = async (data: ServicePaymentFormData) => { setIsSubmitting(true); try { await ServiceItemService.registerPayment(data); setShowServicePaymentModal(false); alert("Registro guardado con éxito"); } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); } };

  const formatDateDisplay = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
  };

  const getContractLabel = (c: Contract) => {
      const t = tenants.find(x => x.code === c.tenantCode);
      const a = apartments.find(x => x.code === c.apartmentCode);
      return `${t?.fullName || c.tenantCode} - ${a?.name || c.apartmentCode}`;
  };

  const activeContractsList = contracts.filter(c => c.status === 'ACTIVE');
  
  // Simple Delinquent Check (Next Date < Today)
  const todayStr = new Date().toISOString().split('T')[0];
  const delinquentContracts = activeContractsList.filter(c => {
      const nextDate = c.nextPaymentDate || c.startDate;
      return nextDate < todayStr;
  });

  if(loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
      <div className="space-y-6 relative">
          
          {/* TENANT DELETE MODAL */}
          {tenantToDelete && (
              <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setTenantToDelete(null)} />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-fadeIn">
                      <div className="flex flex-col items-center text-center space-y-4">
                          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                              {isDeleting ? <Loader size={32} className="animate-spin"/> : <Trash2 size={32}/>}
                          </div>
                          <h3 className="text-xl font-bold text-slate-800">{isDeleting ? 'Eliminando...' : '¿Eliminar Inquilino?'}</h3>
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
                              <button onClick={handleConfirmDeleteTenant} disabled={isDeleting} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-md disabled:opacity-50 flex justify-center items-center gap-2">{isDeleting ? 'Procesando...' : 'Sí, Eliminar'}</button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div><h1 className="text-2xl font-bold text-slate-800">Bienes Raíces</h1><p className="text-slate-500">Gestión de propiedades, alquileres y pagos.</p></div>
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
             <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
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
             
             {(activeTab === 'PROPERTIES' || activeTab === 'UNITS' || activeTab === 'TENANTS' || activeTab === 'CONTRACTS' || activeTab === 'SERVICES') && (
                 <div className="p-8 text-center text-slate-400 italic">(Contenido de la pestaña {activeTab} visible)</div>
             )}

             {/* PAYMENTS TAB */}
             {activeTab === 'PAYMENTS' && (
                 <div>
                    <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                        <div><h3 className="text-lg font-bold text-indigo-900">Control de Alquileres</h3><p className="text-xs text-indigo-700">Gestión de cobros y estados de cuenta</p></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Inquilino</th><th className="px-6 py-3">Unidad / Propiedad</th><th className="px-6 py-3">Periodo / Vencimiento</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeContractsList.filter(c => getContractLabel(c).toLowerCase().includes(searchTerm.toLowerCase())).map(contract => {
                                    const t = tenants.find(x => x.code === contract.tenantCode);
                                    const a = apartments.find(x => x.code === contract.apartmentCode);
                                    const nextPayDate = contract.nextPaymentDate || new Date().toISOString().split('T')[0];
                                    const isLate = nextPayDate < todayStr;
                                    
                                    return (
                                        <tr key={contract.code} className="hover:bg-slate-50 group">
                                            <td className="px-6 py-3"><div className="flex flex-col"><div className="font-bold text-slate-800 flex items-center gap-2"><User size={14} className="text-slate-400"/>{t?.fullName || 'Desconocido'}</div><span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1 border border-slate-200">{contract.tenantCode}</span></div></td>
                                            <td className="px-6 py-3"><div className="text-sm text-slate-700 font-medium">{a?.name || contract.apartmentCode}</div><div className="text-[10px] text-slate-400">{contract.code}</div></td>
                                            <td className="px-6 py-3 text-slate-600 font-mono text-xs">{formatDateDisplay(nextPayDate)}</td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-700">{contract.amount.toLocaleString('es-HN', {style:'currency', currency: 'HNL'})}</td>
                                            <td className="px-6 py-3 text-center">
                                                {isLate ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold"><AlertTriangle size={10}/> Mora</span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold"><CheckCircle size={10}/> Al día</span>}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenPaymentModal(contract)} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"><DollarSign size={14}/> Pago</button>
                                                    <button onClick={() => { setSelectedContract(contract); setShowBulkModal(true); }} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"><List size={14}/> Masivo</button>
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

             {/* DELINQUENT TAB */}
             {activeTab === 'DELINQUENT' && (
                 <div className="overflow-x-auto">
                    {delinquentContracts.length === 0 ? (
                        <div className="p-12 text-center"><div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32}/></div><h3 className="text-lg font-bold text-slate-800">¡Todo al día!</h3><p className="text-slate-500">No hay inquilinos con pagos atrasados.</p></div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-rose-50 text-rose-800 font-medium"><tr><th className="px-6 py-3">Inquilino</th><th className="px-6 py-3">Unidad / Contrato</th><th className="px-6 py-3">Próximo Pago (Vencido)</th><th className="px-6 py-3 text-right">Monto Pendiente</th><th className="px-6 py-3 text-center">Acciones</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {delinquentContracts.map(c => {
                                    const t = tenants.find(x => x.code === c.tenantCode);
                                    const a = apartments.find(x => x.code === c.apartmentCode);
                                    return (
                                        <tr key={c.code} className="hover:bg-slate-50">
                                            <td className="px-6 py-3"><div className="font-bold text-slate-800">{t?.fullName || c.tenantCode}</div><div className="text-xs text-slate-400 font-mono bg-slate-100 px-1 rounded w-fit">{c.tenantCode}</div></td>
                                            <td className="px-6 py-3"><div className="text-sm text-slate-700">{a?.name || c.apartmentCode}</div><div className="text-[10px] text-slate-400 font-mono">{c.code}</div></td>
                                            <td className="px-6 py-3"><div className="flex items-center gap-2 text-rose-600 font-bold"><AlertTriangle size={16}/>{formatDateDisplay(c.nextPaymentDate)}</div><span className="text-xs text-rose-400">Vencido</span></td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">{c.amount.toLocaleString('es-HN', {style: 'currency', currency: 'HNL'})}</td>
                                            <td className="px-6 py-3 text-center"><button onClick={() => handleOpenPaymentModal(c)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 mx-auto"><DollarSign size={14}/> Cobrar Ahora</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
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
          <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSubmit={handleRegisterPayment} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} initialDescription={paymentModalDesc} isSubmitting={isSubmitting} />
          <PaymentHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} tenantName={tenants.find(t => t.code === selectedContract?.tenantCode)?.fullName} unitName={apartments.find(a => a.code === selectedContract?.apartmentCode)?.name} onRegisterPayment={handleHistoryRegisterPayment} onDeleteTransaction={handleDeleteContractTransaction} />
          <BulkPaymentModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSubmit={handleBulkPayment} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} isSubmitting={isSubmitting} />
          <ContractPriceHistoryModal isOpen={showPriceHistoryModal} onClose={() => setShowPriceHistoryModal(false)} contract={selectedContract} contractLabel={selectedContract ? getContractLabel(selectedContract) : ''} />
      </div>
  );
};

export default RealEstatePage;