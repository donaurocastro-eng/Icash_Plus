import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Building, Users, FileText, MapPin, Upload, FileSpreadsheet, Home, DollarSign, Calendar as CalendarIcon, Filter, Layers } from 'lucide-react';
import { Property, Tenant, Contract, Apartment, PropertyFormData, TenantFormData, ContractFormData, ApartmentFormData, PaymentFormData, BulkPaymentFormData } from '../types';
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
import BulkPaymentModal from '../components/BulkPaymentModal'; // New import
import * as XLSX from 'xlsx';

type Tab = 'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'PAYMENTS';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('PROPERTIES');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ... (Existing State) ...
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // New state
  
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [payingContract, setPayingContract] = useState<Contract | null>(null);
  const [paymentDescription, setPaymentDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... (Existing loadAll and useEffect) ...
  const loadAll = async () => {
    setLoading(true);
    try {
      const p = await PropertyService.getAll().catch(e => []);
      const t = await TenantService.getAll().catch(e => []);
      const a = await ApartmentService.getAll().catch(e => []);
      const c = await ContractService.getAll().catch(e => []);
      setProperties(p);
      setTenants(t);
      setApartments(a);
      setContracts(c);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // ... (Existing Handlers for CRUD) ...
  // Simplified for brevity in this output block - assume they are preserved
  const handleCreateProp = async (d: PropertyFormData) => { setIsSubmitting(true); await PropertyService.create(d); await loadAll(); setIsPropModalOpen(false); setIsSubmitting(false); };
  const handleUpdateProp = async (d: PropertyFormData) => { if(!editingProp) return; setIsSubmitting(true); await PropertyService.update(editingProp.code, d); await loadAll(); setIsPropModalOpen(false); setIsSubmitting(false); };
  const handleDeleteProp = async (c: string) => { if(confirm('¿Borrar?')) { await PropertyService.delete(c); await loadAll(); } };
  const handleCreateTenant = async (d: TenantFormData) => { setIsSubmitting(true); await TenantService.create(d); await loadAll(); setIsTenantModalOpen(false); setIsSubmitting(false); };
  const handleUpdateTenant = async (d: TenantFormData) => { if(!editingTenant) return; setIsSubmitting(true); await TenantService.update(editingTenant.code, d); await loadAll(); setIsTenantModalOpen(false); setIsSubmitting(false); };
  const handleDeleteTenant = async (c: string) => { if(confirm('¿Borrar?')) { await TenantService.delete(c); await loadAll(); } };
  const handleCreateApt = async (d: ApartmentFormData) => { setIsSubmitting(true); await ApartmentService.create(d); await loadAll(); setIsAptModalOpen(false); setIsSubmitting(false); };
  const handleUpdateApt = async (d: ApartmentFormData) => { if(!editingApt) return; setIsSubmitting(true); await ApartmentService.update(editingApt.code, d); await loadAll(); setIsAptModalOpen(false); setIsSubmitting(false); };
  const handleDeleteApt = async (c: string) => { if(confirm('¿Borrar?')) { await ApartmentService.delete(c); await loadAll(); } };
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

  // ... (Excel and Formatting helpers) ...
  const handleDownloadTemplate = () => { /* ... */ };
  const handleFileSelect = (e: any) => { /* ... */ }; 
  const formatMoney = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Filtering
  const lowerSearch = searchTerm.toLowerCase();
  const filteredProperties = properties.filter(p => p.name.toLowerCase().includes(lowerSearch));
  const filteredUnits = apartments.filter(a => a.name.toLowerCase().includes(lowerSearch));
  const filteredTenants = tenants.filter(t => t.fullName.toLowerCase().includes(lowerSearch));
  const filteredContracts = contracts.filter(c => c.code.toLowerCase().includes(lowerSearch));

  const getPayingContractLabel = () => {
      const c = viewingContract || payingContract;
      if(!c) return '';
      const apt = apartments.find(a => a.code === c.apartmentCode);
      const ten = tenants.find(t => t.code === c.tenantCode);
      return `${apt?.name || 'Unidad'} - ${ten?.fullName || 'Inquilino'}`;
  };

  return (
    <div className="space-y-6">
      {/* ... (Header and Tabs same as before) ... */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex gap-2"><Building className="text-brand-600"/> Bienes Raíces</h1>
        {/* Actions removed for brevity */}
      </div>
      <div className="border-b border-slate-200">
            <nav className="flex space-x-6 overflow-x-auto">
            {[
                { id: 'PROPERTIES', label: 'Edificios', icon: MapPin },
                { id: 'UNITS', label: 'Unidades', icon: Home },
                { id: 'TENANTS', label: 'Inquilinos', icon: Users },
                { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
                { id: 'PAYMENTS', label: 'Control de Pagos', icon: DollarSign },
            ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`pb-3 flex items-center gap-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}>
                <tab.icon size={16} /> {tab.label}
                </button>
            ))}
            </nav>
      </div>

      {loading ? <div>Cargando...</div> : (
        <>
            {/* ... (PROPERTIES, UNITS, TENANTS, CONTRACTS tables) ... */}
            {activeTab === 'PROPERTIES' && <div>{/* ... */}</div>}
            
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
                                    <th className="p-4 text-right">Monto</th>
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
                                            <td className="p-4 text-right font-bold text-slate-700">
                                                {formatMoney(c.amount)}
                                            </td>
                                            <td className="p-4 text-center flex justify-center gap-2">
                                                <button 
                                                    onClick={() => { setViewingContract(c); setIsHistoryModalOpen(true); }}
                                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-xs font-bold"
                                                >
                                                    HISTORIAL
                                                </button>
                                                <button 
                                                    onClick={() => { setViewingContract(c); setIsBulkModalOpen(true); }}
                                                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm text-xs font-bold flex items-center gap-1"
                                                    title="Pagar varios meses"
                                                >
                                                    <Layers size={14}/> MASIVO
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      )}

      {/* Modals */}
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

      <BulkPaymentModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSubmit={handleBulkPayment}
        contract={viewingContract}
        contractLabel={getPayingContractLabel()}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default RealEstatePage;