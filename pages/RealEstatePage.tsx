import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Home, 
  Users, 
  FileText, 
  Zap, 
  DollarSign, 
  History, 
  Layers, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { 
  Property, Apartment, Tenant, Contract, PropertyServiceItem, Transaction,
  PropertyFormData, ApartmentFormData, TenantFormData, ContractFormData,
  PaymentFormData, BulkPaymentFormData, PropertyServiceItemFormData, ServicePaymentFormData
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
import PaymentModal from '../components/PaymentModal';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import BulkPaymentModal from '../components/BulkPaymentModal';
import ContractPriceHistoryModal from '../components/ContractPriceHistoryModal';
import ServiceItemModal from '../components/ServiceItemModal';
import ServicePaymentModal from '../components/ServicePaymentModal';

type TabType = 'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'SERVICES' | 'PAYMENTS' | 'DELINQUENT';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('CONTRACTS');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data State
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [services, setServices] = useState<PropertyServiceItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // Required for smart checks

  // Modals State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [showApartmentModal, setShowApartmentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

  const [showTenantModal, setShowTenantModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<PropertyServiceItem | null>(null);
  const [showServicePaymentModal, setShowServicePaymentModal] = useState(false);

  // --- DATA LOADING ---
  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, a, t, c, s, tx] = await Promise.all([
        PropertyService.getAll(),
        ApartmentService.getAll(),
        TenantService.getAll(),
        ContractService.getAll(),
        ServiceItemService.getAll(),
        TransactionService.getAll()
      ]);
      setProperties(p);
      setApartments(a);
      setTenants(t);
      setContracts(c);
      setServices(s);
      setTransactions(tx);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // --- HANDLERS: PROPERTY ---
  const handlePropertySubmit = async (data: PropertyFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedProperty) await PropertyService.update(selectedProperty.code, data);
      else await PropertyService.create(data);
      await loadAll();
    } finally { setIsSubmitting(false); }
  };
  const handleDeleteProperty = async (code: string) => {
    if(!confirm("¿Eliminar propiedad?")) return;
    await PropertyService.delete(code);
    loadAll();
  };

  // --- HANDLERS: APARTMENT ---
  const handleApartmentSubmit = async (data: ApartmentFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedApartment) await ApartmentService.update(selectedApartment.code, data);
      else await ApartmentService.create(data);
      await loadAll();
    } finally { setIsSubmitting(false); }
  };
  const handleDeleteApartment = async (code: string) => {
    if(!confirm("¿Eliminar unidad?")) return;
    await ApartmentService.delete(code);
    loadAll();
  };

  // --- HANDLERS: TENANT ---
  const handleTenantSubmit = async (data: TenantFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedTenant) await TenantService.update(selectedTenant.code, data);
      else await TenantService.create(data);
      await loadAll();
    } finally { setIsSubmitting(false); }
  };
  const handleDeleteTenant = async (code: string) => {
    if(!confirm("¿Eliminar inquilino?")) return;
    await TenantService.delete(code);
    loadAll();
  };

  // --- HANDLERS: CONTRACT ---
  const handleContractSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedContract) await ContractService.update(selectedContract.code, data);
      else await ContractService.create(data);
      await loadAll();
    } finally { setIsSubmitting(false); }
  };
  const handleDeleteContract = async (code: string) => {
    if(!confirm("¿Eliminar contrato? Se perderá el historial.")) return;
    await ContractService.delete(code);
    loadAll();
  };

  // --- HANDLERS: PAYMENTS ---
  const handleRegisterPayment = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      await ContractService.registerPayment(data);
      await loadAll();
      setShowPaymentModal(false);
    } finally { setIsSubmitting(false); }
  };

  const handleBulkPayment = async (data: BulkPaymentFormData) => {
    setIsSubmitting(true);
    try {
      await ContractService.processBulkPayment(data);
      await loadAll();
      setShowBulkModal(false);
    } finally { setIsSubmitting(false); }
  };

  const handleDeletePaymentHistory = async (code: string) => {
      try {
          await TransactionService.delete(code);
          await loadAll(); 
          alert("El pago se ha eliminado correctamente. El saldo ha sido revertido.");
      } catch (e: any) {
          alert(e.message);
          throw e; 
      }
  };

  // --- HANDLERS: SERVICE ---
  const handleServiceSubmit = async (data: PropertyServiceItemFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedService) await ServiceItemService.update(selectedService.code, data);
      else await ServiceItemService.create(data);
      await loadAll();
    } finally { setIsSubmitting(false); }
  };
  const handleDeleteService = async (code: string) => {
    if(!confirm("¿Eliminar servicio?")) return;
    await ServiceItemService.delete(code);
    loadAll();
  };
  const handleServicePayment = async (data: ServicePaymentFormData) => {
    setIsSubmitting(true);
    try {
      await ServiceItemService.registerPayment(data);
      await loadAll();
      setShowServicePaymentModal(false);
    } finally { setIsSubmitting(false); }
  };

  // --- HELPERS ---
  const getContractLabel = (c: Contract) => {
      const t = tenants.find(x => x.code === c.tenantCode);
      const a = apartments.find(x => x.code === c.apartmentCode);
      return `${t?.fullName || c.tenantCode} - ${a?.name || c.apartmentCode}`;
  };

  const openPaymentForDate = (date: Date) => {
     setShowHistoryModal(false);
     setShowPaymentModal(true);
  };

  // --- SMART CHECK LOGIC ---
  const checkIfPaidInPeriod = (contract: Contract) => {
      if (!contract.nextPaymentDate) return false;
      const dueDate = new Date(contract.nextPaymentDate);
      // Correct for Timezone
      const correctedDueDate = new Date(dueDate.valueOf() + dueDate.getTimezoneOffset() * 60000);
      const dueMonth = correctedDueDate.getMonth();
      const dueYear = correctedDueDate.getFullYear();

      // Find transaction match
      const paid = transactions.find(t => {
          if (t.type !== 'INGRESO') return false;
          const tDate = new Date(t.date);
          const correctedTDate = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
          
          // Match Month/Year
          if (correctedTDate.getMonth() !== dueMonth || correctedTDate.getFullYear() !== dueYear) return false;

          // Strong Match: Contract Code
          if (t.contractCode === contract.code) return true;
          
          // Medium Match: Property Code (if set on contract)
          if (contract.propertyCode && t.propertyCode === contract.propertyCode) return true;
          
          // Weak Match: Fuzzy Description
          const tObj = tenants.find(te => te.code === contract.tenantCode);
          const aObj = apartments.find(ap => ap.code === contract.apartmentCode);
          
          // Safer access to description
          const desc = (t.description || '').toLowerCase();
          
          if (tObj && tObj.fullName && desc.includes(tObj.fullName.toLowerCase())) return true;
          if (aObj && aObj.name && desc.includes(aObj.name.toLowerCase())) return true;

          return false;
      });

      return !!paid;
  };

  const isDelinquent = (c: Contract) => {
      if (c.status !== 'ACTIVE') return false;
      if (!c.nextPaymentDate) return false;
      
      const today = new Date();
      const nextDate = new Date(c.nextPaymentDate);
      const correctedNextDate = new Date(nextDate.valueOf() + nextDate.getTimezoneOffset() * 60000);

      // If today is BEFORE due date, NOT delinquent
      if (today < correctedNextDate) return false;

      // If today is AFTER due date, check if paid anyway
      if (checkIfPaidInPeriod(c)) return false;

      return true;
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setSearchTerm(''); }}
      className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-bold transition-all ${
        activeTab === id 
          ? 'bg-slate-800 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const PaymentStatusBadge = ({ contract }: { contract: Contract }) => {
      if (contract.status !== 'ACTIVE') return <span className="text-slate-400 font-mono text-xs">INACTIVO</span>;
      
      const today = new Date();
      const nextDate = new Date(contract.nextPaymentDate);
      const correctedNextDate = new Date(nextDate.valueOf() + nextDate.getTimezoneOffset() * 60000);
      
      const isPaid = checkIfPaidInPeriod(contract);
      
      if (isPaid) {
          return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">AL DÍA</span>;
      }
      
      if (today > correctedNextDate) {
          return <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold">MORA</span>;
      }
      
      return <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-bold">PENDIENTE</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión Inmobiliaria</h1>
          <p className="text-slate-500">Administra propiedades, contratos y cobros.</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <TabButton id="CONTRACTS" label="Contratos" icon={FileText} />
          <TabButton id="PAYMENTS" label="Control Pagos" icon={DollarSign} />
          <TabButton id="DELINQUENT" label="En Mora" icon={AlertTriangle} />
          <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
          <TabButton id="PROPERTIES" label="Propiedades" icon={Home} />
          <TabButton id="UNITS" label="Unidades" icon={Layers} />
          <TabButton id="TENANTS" label="Inquilinos" icon={Users} />
          <TabButton id="SERVICES" label="Servicios" icon={Zap} />
        </div>
      </div>

      {/* SEARCH & ADD ACTION */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          {activeTab === 'PROPERTIES' && (
            <button onClick={() => { setSelectedProperty(null); setShowPropertyModal(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold"><Plus size={18}/> Propiedad</button>
          )}
          {activeTab === 'UNITS' && (
            <button onClick={() => { setSelectedApartment(null); setShowApartmentModal(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold"><Plus size={18}/> Unidad</button>
          )}
          {activeTab === 'TENANTS' && (
            <button onClick={() => { setSelectedTenant(null); setShowTenantModal(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold"><Plus size={18}/> Inquilino</button>
          )}
          {activeTab === 'CONTRACTS' && (
            <button onClick={() => { setSelectedContract(null); setShowContractModal(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold"><Plus size={18}/> Contrato</button>
          )}
          {activeTab === 'SERVICES' && (
            <button onClick={() => { setSelectedService(null); setShowServiceModal(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold"><Plus size={18}/> Servicio</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {/* VIEW: CONTRACTS */}
        {activeTab === 'CONTRACTS' && (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
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
                                        <div className="font-bold text-slate-800">{t?.fullName || contract.tenantCode}</div>
                                        <div className="text-xs text-slate-500">{a?.name || contract.apartmentCode}</div>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-slate-500">
                                        <div>Inicio: {contract.startDate}</div>
                                        <div>Fin: {contract.endDate || 'Indefinido'}</div>
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">
                                        {contract.amount.toLocaleString('es-HN', {style:'currency', currency: 'HNL'})}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold text-xs">Día {contract.paymentDay}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${contract.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {contract.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => { setSelectedContract(contract); setShowContractModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title="Editar"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteContract(contract.code)} className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Eliminar"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {/* VIEW: PAYMENTS / CONTROL PAGOS */}
        {activeTab === 'PAYMENTS' && (
            <div className="overflow-x-auto">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-indigo-800 text-sm font-bold flex items-center gap-2">
                    <Calendar size={18}/> Calendario de Pagos
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Inquilino / Unidad</th>
                            <th className="px-6 py-3 text-center">Próximo Pago</th>
                            <th className="px-6 py-3 text-right">Monto</th>
                            <th className="px-6 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {contracts.filter(c => c.status === 'ACTIVE' && getContractLabel(c).toLowerCase().includes(searchTerm.toLowerCase())).map(contract => {
                            const t = tenants.find(x => x.code === contract.tenantCode);
                            const a = apartments.find(x => x.code === contract.apartmentCode);
                            return (
                                <tr key={contract.code} className="hover:bg-slate-50">
                                    <td className="px-6 py-3">
                                        <PaymentStatusBadge contract={contract} />
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="font-bold text-slate-800">{t?.fullName}</div>
                                        <div className="text-xs text-slate-500">{a?.name}</div>
                                    </td>
                                    <td className="px-6 py-3 text-center font-mono text-slate-600">
                                        {contract.nextPaymentDate}
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-slate-700">
                                        {contract.amount.toLocaleString('es-HN', {minimumFractionDigits:2})}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setSelectedContract(contract); setShowHistoryModal(true); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">HISTORIAL</button>
                                            <button onClick={() => { setSelectedContract(contract); setShowBulkModal(true); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1"><Layers size={14}/> MASIVO</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {/* VIEW: DELINQUENT / EN MORA */}
        {activeTab === 'DELINQUENT' && (
            <div className="overflow-x-auto">
                <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-800 text-sm font-bold flex items-center gap-2">
                    <AlertTriangle size={18}/> Inquilinos en Mora
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Inquilino</th>
                            <th className="px-6 py-3">Unidad</th>
                            <th className="px-6 py-3">Contacto</th>
                            <th className="px-6 py-3 text-center">Vencimiento</th>
                            <th className="px-6 py-3 text-right">Monto Deuda</th>
                            <th className="px-6 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {contracts
                            .filter(c => c.status === 'ACTIVE' && isDelinquent(c))
                            .map(contract => {
                                const t = tenants.find(x => x.code === contract.tenantCode);
                                const a = apartments.find(x => x.code === contract.apartmentCode);
                                return (
                                    <tr key={contract.code} className="hover:bg-rose-50/30">
                                        <td className="px-6 py-3 font-bold text-slate-800">{t?.fullName}</td>
                                        <td className="px-6 py-3 text-slate-600">{a?.name}</td>
                                        <td className="px-6 py-3 text-xs text-slate-500">
                                            {t?.phone && <div>{t.phone}</div>}
                                            {t?.email && <div>{t.email}</div>}
                                        </td>
                                        <td className="px-6 py-3 text-center font-bold text-rose-600">
                                            {contract.nextPaymentDate}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-700">
                                            {contract.amount.toLocaleString('es-HN', {minimumFractionDigits:2})}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => { setSelectedContract(contract); setShowHistoryModal(true); }} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-sm animate-pulse">COBRAR</button>
                                        </td>
                                    </tr>
                                );
                        })}
                        {contracts.filter(c => c.status === 'ACTIVE' && isDelinquent(c)).length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">¡Felicidades! No hay inquilinos en mora.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* VIEW: PROPERTIES */}
        {activeTab === 'PROPERTIES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {properties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <div key={p.code} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Home size={20}/></div>
                            <div className="flex gap-1">
                                <button onClick={() => { setSelectedProperty(p); setShowPropertyModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                                <button onClick={() => handleDeleteProperty(p.code)} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800">{p.name}</h3>
                        <p className="text-xs text-slate-500 mb-3">{p.code}</p>
                        <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
                            <span className="text-slate-500">Valor:</span>
                            <span className="font-bold text-slate-700">{p.value.toLocaleString()} {p.currency}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* VIEW: UNITS */}
        {activeTab === 'UNITS' && (
            <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Unidad</th><th className="px-6 py-3">Edificio</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {apartments.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(a => {
                            const p = properties.find(x => x.code === a.propertyCode);
                            return (
                                <tr key={a.code} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-bold text-slate-700">{a.name}</td>
                                    <td className="px-6 py-3 text-slate-500">{p?.name || a.propertyCode}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : a.status === 'RENTED' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {a.status === 'AVAILABLE' ? 'DISPONIBLE' : a.status === 'RENTED' ? 'ALQUILADO' : 'MANTENIMIENTO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                         <div className="flex justify-end gap-1">
                                            <button onClick={() => { setSelectedApartment(a); setShowApartmentModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteApartment(a.code)} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
            </div>
        )}

        {/* VIEW: TENANTS */}
        {activeTab === 'TENANTS' && (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Contacto</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {tenants.filter(t => t.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                             <tr key={t.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold text-slate-700">{t.fullName}</td>
                                <td className="px-6 py-3 text-slate-500 text-xs">
                                    {t.phone && <div>Tel: {t.phone}</div>}
                                    {t.email && <div>Email: {t.email}</div>}
                                </td>
                                <td className="px-6 py-3 text-center">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {t.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => { setSelectedTenant(t); setShowTenantModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteTenant(t.code)} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* VIEW: SERVICES */}
        {activeTab === 'SERVICES' && (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Servicio</th><th className="px-6 py-3">Propiedad</th><th className="px-6 py-3 text-right">Costo Est.</th><th className="px-6 py-3 text-center">Estado</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
                            const p = properties.find(x => x.code === s.propertyCode);
                            return (
                                <tr key={s.code} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-bold text-slate-700">{s.name}</td>
                                    <td className="px-6 py-3 text-slate-500">{p?.name || s.propertyCode}</td>
                                    <td className="px-6 py-3 text-right font-mono">{s.defaultAmount}</td>
                                    <td className="px-6 py-3 text-center">
                                        {s.active ? <CheckCircle size={16} className="text-emerald-500 mx-auto"/> : <XCircle size={16} className="text-slate-300 mx-auto"/>}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => { setSelectedService(s); setShowServicePaymentModal(true); }} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded" title="Pagar"><CreditCard size={16}/></button>
                                            <button onClick={() => { setSelectedService(s); setShowServiceModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteService(s.code)} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
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

      {/* MODALS */}
      <PropertyModal isOpen={showPropertyModal} onClose={() => setShowPropertyModal(false)} onSubmit={handlePropertySubmit} editingProperty={selectedProperty} isSubmitting={isSubmitting}/>
      <ApartmentModal isOpen={showApartmentModal} onClose={() => setShowApartmentModal(false)} onSubmit={handleApartmentSubmit} editingApartment={selectedApartment} isSubmitting={isSubmitting}/>
      <TenantModal isOpen={showTenantModal} onClose={() => setShowTenantModal(false)} onSubmit={handleTenantSubmit} editingTenant={selectedTenant} isSubmitting={isSubmitting}/>
      <ContractModal isOpen={showContractModal} onClose={() => setShowContractModal(false)} onSubmit={handleContractSubmit} editingContract={selectedContract} isSubmitting={isSubmitting}/>
      
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        onSubmit={handleRegisterPayment} 
        contract={selectedContract} 
        contractLabel={selectedContract ? getContractLabel(selectedContract) : ''}
        initialDescription={`Pago Alquiler - ${selectedContract ? getContractLabel(selectedContract) : ''}`}
        isSubmitting={isSubmitting}
      />

      <PaymentHistoryModal 
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        contract={selectedContract}
        contractLabel={selectedContract ? getContractLabel(selectedContract) : ''}
        tenantName={tenants.find(t => t.code === selectedContract?.tenantCode)?.fullName}
        unitName={apartments.find(a => a.code === selectedContract?.apartmentCode)?.name}
        onRegisterPayment={openPaymentForDate}
        onDeleteTransaction={handleDeletePaymentHistory}
      />

      <BulkPaymentModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkPayment}
        contract={selectedContract}
        contractLabel={selectedContract ? getContractLabel(selectedContract) : ''}
        isSubmitting={isSubmitting}
      />

      <ContractPriceHistoryModal
        isOpen={showPriceHistoryModal}
        onClose={() => setShowPriceHistoryModal(false)}
        contract={selectedContract}
        contractLabel={selectedContract ? getContractLabel(selectedContract) : ''}
      />

      <ServiceItemModal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} onSubmit={handleServiceSubmit} editingItem={selectedService} isSubmitting={isSubmitting}/>
      <ServicePaymentModal isOpen={showServicePaymentModal} onClose={() => setShowServicePaymentModal(false)} onSubmit={handleServicePayment} serviceItem={selectedService} isSubmitting={isSubmitting}/>

    </div>
  );
};

export default RealEstatePage;