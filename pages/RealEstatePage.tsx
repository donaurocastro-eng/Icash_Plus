
import React, { useEffect, useState, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Building, Home, Users, FileText, Zap, 
  DollarSign, Calendar, Clock, CheckCircle, TrendingUp, MoreVertical, Key,
  CreditCard, List, AlertTriangle, ArrowRight, User, Loader, X, Filter, RefreshCw,
  FileSpreadsheet, Upload, Info, Receipt
} from 'lucide-react';
import { 
  Property, Apartment, Tenant, Contract, PropertyServiceItem, Transaction, Category, Account,
  PropertyFormData, ApartmentFormData, TenantFormData, ContractFormData, 
  PropertyServiceItemFormData, ServicePaymentFormData, PaymentFormData, BulkPaymentFormData 
} from '../types';
import { PropertyService } from '../services/propertyService';
import { ApartmentService } from '../services/apartmentService';
import { TenantService } from '../services/tenantService';
import { ContractService } from '../services/contractService';
import { ServiceItemService } from '../services/serviceItemService';
import { TransactionService } from '../services/transactionService';
import { AccountService } from '../services/accountService';
import { CategoryService } from '../services/categoryService';

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
import * as XLSX from 'xlsx';

const RealEstatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'UNITS' | 'TENANTS' | 'CONTRACTS' | 'PAYMENTS' | 'DELINQUENT' | 'SERVICES'>('CONTRACTS');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import Status
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'STANDARD' | 'SERVICE_PAYMENTS'>('STANDARD');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [services, setServices] = useState<PropertyServiceItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const [props, apts, tens, conts, servs, txs, accs, cats] = await Promise.all([
            PropertyService.getAll(),
            ApartmentService.getAll(),
            TenantService.getAll(),
            ContractService.getAll(),
            ServiceItemService.getAll(),
            TransactionService.getAll(),
            AccountService.getAll(),
            CategoryService.getAll()
        ]);
        setProperties(props);
        setApartments(apts);
        setTenants(tens);
        setContracts(conts);
        setServices(servs);
        setTransactions(txs);
        setAccounts(accs);
        setCategories(cats);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- ROBUST EXCEL LOGIC WITH MULTIPLE SHEETS ---
  const handleDownloadTemplate = (mode: 'STANDARD' | 'SERVICE_PAYMENTS' = 'STANDARD') => {
    const wb = XLSX.utils.book_new();
    let headers: string[] = [];
    let helpRow: any[] = [];
    let fileName = "";
    let mainSheetName = "Importar";

    if (mode === 'SERVICE_PAYMENTS') {
        headers = ['Cod_Servicio', 'Fecha (YYYY-MM-DD)', 'Monto_Pagado', 'Nota_Opcional'];
        helpRow = ['Ej: SERV-001', '2024-03-25', 1250.50, 'Pago mes de marzo'];
        fileName = "plantilla_importar_pagos_servicios.xlsx";
        mainSheetName = "Importar_Pagos_Servicios";
        
        // Add Service References Sheet
        const sRef = XLSX.utils.aoa_to_sheet([
            ['Codigo', 'Nombre_Servicio', 'Propiedad', 'Monto_Estimado', 'Cuenta_Defecto', 'Categoria_Defecto'], 
            ...services.map(s => [
                s.code, 
                s.name, 
                properties.find(p => p.code === s.propertyCode)?.name || s.propertyCode, 
                s.defaultAmount,
                s.defaultAccountCode || 'No asignada',
                s.defaultCategoryCode || 'No asignada'
            ])
        ]);
        XLSX.utils.book_append_sheet(wb, sRef, "REF_SERVICIOS_ACTIVOS");
    } else {
        switch(activeTab) {
            case 'PROPERTIES':
                headers = ['Nombre', 'Valor', 'Moneda', 'Clave_Catastral', 'Impuesto_Anual'];
                helpRow = ['Ej: Edificio Los Pinos', 5000000, 'HNL', '0801-2000-00123', 1500];
                fileName = "plantilla_propiedades.xlsx";
                mainSheetName = "Importar_Propiedades";
                break;
            case 'UNITS':
                headers = ['Cod_Propiedad', 'Nombre_Unidad', 'Estado (AVAILABLE/RENTED/MAINTENANCE)'];
                helpRow = ['Ej: AP-001', 'Apartamento 101', 'AVAILABLE'];
                fileName = "plantilla_unidades.xlsx";
                mainSheetName = "Importar_Unidades";
                const propWs = XLSX.utils.aoa_to_sheet([['Codigo', 'Nombre'], ...properties.map(p => [p.code, p.name])]);
                XLSX.utils.book_append_sheet(wb, propWs, "REF_PROPIEDADES");
                break;
            case 'TENANTS':
                headers = ['Nombre_Completo', 'Telefono', 'Email', 'Estado (ACTIVE/INACTIVE)'];
                helpRow = ['Ej: Juan Perez', '9988-7766', 'juan@ejemplo.com', 'ACTIVE'];
                fileName = "plantilla_inquilinos.xlsx";
                mainSheetName = "Importar_Inquilinos";
                break;
            case 'CONTRACTS':
                headers = ['Cod_Unidad', 'Cod_Inquilino', 'Monto_Mensual', 'Fecha_Inicio (YYYY-MM-DD)', 'Fecha_Fin', 'Dia_Pago (1-31)'];
                helpRow = ['Ej: UNIT-001', 'INQ-001', 8500, '2024-01-01', '2024-12-31', 5];
                fileName = "plantilla_contratos.xlsx";
                mainSheetName = "Importar_Contratos";
                const unitRef = XLSX.utils.aoa_to_sheet([['Codigo', 'Nombre'], ...apartments.map(a => [a.code, a.name])]);
                XLSX.utils.book_append_sheet(wb, unitRef, "REF_UNIDADES");
                const tenRef = XLSX.utils.aoa_to_sheet([['Codigo', 'Nombre'], ...tenants.map(t => [t.code, t.fullName])]);
                XLSX.utils.book_append_sheet(wb, tenRef, "REF_INQUILINOS");
                break;
            case 'SERVICES':
                headers = ['Cod_Propiedad', 'Nombre_Servicio', 'Monto_Estimado', 'Cod_Categoria_Gasto', 'Cod_Cuenta_Pago'];
                helpRow = ['Ej: AP-001', 'Energia Electrica', 1200, 'CAT-EXP-001', 'CTA-001'];
                fileName = "plantilla_servicios.xlsx";
                mainSheetName = "Importar_Servicios";
                const pRef = XLSX.utils.aoa_to_sheet([['Codigo', 'Nombre'], ...properties.map(p => [p.code, p.name])]);
                XLSX.utils.book_append_sheet(wb, pRef, "REF_PROPIEDADES");
                const cRef = XLSX.utils.aoa_to_sheet([['Codigo', 'Nombre'], ...categories.filter(c => c.type === 'GASTO').map(c => [c.code, c.name])]);
                XLSX.utils.book_append_sheet(wb, cRef, "REF_CATEGORIAS");
                const aRef = XLSX.utils.aoa_to_sheet([['Codigo', 'Nombre'], ...accounts.map(a => [a.code, a.name])]);
                XLSX.utils.book_append_sheet(wb, aRef, "REF_CUENTAS");
                break;
            default: return;
        }
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, helpRow]);
    ws['!cols'] = headers.map(h => ({ wch: h.length + 12 }));
    XLSX.utils.book_append_sheet(wb, ws, mainSheetName);
    XLSX.writeFile(wb, fileName);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'STANDARD' | 'SERVICE_PAYMENTS' = 'STANDARD') => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0], mode);
    }
    e.target.value = '';
  };

  const processExcelFile = async (file: File, mode: 'STANDARD' | 'SERVICE_PAYMENTS' = 'STANDARD') => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: 0, status: 'Analizando archivo...' });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];
        
        const rowsToProcess = json.filter(row => {
            const firstVal = String(Object.values(row)[0]);
            return !firstVal.startsWith('Ej:');
        });

        if (rowsToProcess.length === 0) {
            setNotification({ type: 'error', message: "El archivo no contiene datos válidos." });
            setIsImporting(false);
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rowsToProcess.length; i++) {
            const row = rowsToProcess[i];
            const rowNum = i + 1;
            try {
                setImportProgress({ current: rowNum, total: rowsToProcess.length, status: `Procesando fila ${rowNum} de ${rowsToProcess.length}...` });

                if (mode === 'SERVICE_PAYMENTS') {
                    const serviceCode = String(row['Cod_Servicio'] || '').trim();
                    const service = services.find(s => s.code === serviceCode);
                    
                    if (!service) throw new Error(`Servicio ${serviceCode} no encontrado.`);
                    if (!service.defaultAccountCode || !service.defaultCategoryCode) {
                        throw new Error(`Servicio ${serviceCode} no tiene configurada cuenta o categoría por defecto.`);
                    }

                    await ServiceItemService.registerPayment({
                        serviceCode: service.code,
                        date: String(row['Fecha (YYYY-MM-DD)'] || '').trim(),
                        amount: parseFloat(row['Monto_Pagado']) || 0,
                        accountCode: service.defaultAccountCode,
                        categoryCode: service.defaultCategoryCode,
                        description: String(row['Nota_Opcional'] || `Pago Importado: ${service.name}`).trim()
                    });
                } else {
                    if (activeTab === 'PROPERTIES') {
                        await PropertyService.create({
                            name: String(row['Nombre'] || '').trim(),
                            value: parseFloat(row['Valor']) || 0,
                            currency: (row['Moneda'] || 'HNL') as any,
                            cadastralKey: String(row['Clave_Catastral'] || '').trim(),
                            annualTax: parseFloat(row['Impuesto_Anual']) || 0
                        });
                    } else if (activeTab === 'UNITS') {
                        await ApartmentService.create({
                            propertyCode: String(row['Cod_Propiedad'] || '').trim(),
                            name: String(row['Nombre_Unidad'] || '').trim(),
                            status: (row['Estado (AVAILABLE/RENTED/MAINTENANCE)'] || 'AVAILABLE') as any
                        });
                    } else if (activeTab === 'TENANTS') {
                        await TenantService.create({
                            fullName: String(row['Nombre_Completo'] || '').trim(),
                            phone: String(row['Telefono'] || '').trim(),
                            email: String(row['Email'] || '').trim(),
                            status: (row['Estado (ACTIVE/INACTIVE)'] || 'ACTIVE') as any
                        });
                    } else if (activeTab === 'CONTRACTS') {
                        await ContractService.create({
                            apartmentCode: String(row['Cod_Unidad'] || '').trim(),
                            tenantCode: String(row['Cod_Inquilino'] || '').trim(),
                            amount: parseFloat(row['Monto_Mensual']) || 0,
                            startDate: String(row['Fecha_Inicio (YYYY-MM-DD)'] || '').trim(),
                            endDate: String(row['Fecha_Fin'] || '').trim(),
                            paymentDay: parseInt(row['Dia_Pago (1-31)']) || 1
                        });
                    } else if (activeTab === 'SERVICES') {
                        await ServiceItemService.create({
                            propertyCode: String(row['Cod_Propiedad'] || '').trim(),
                            name: String(row['Nombre_Servicio'] || '').trim(),
                            defaultAmount: parseFloat(row['Monto_Estimado']) || 0,
                            defaultCategoryCode: String(row['Cod_Categoria_Gasto'] || '').trim(),
                            defaultAccountCode: String(row['Cod_Cuenta_Pago'] || '').trim(),
                            active: true
                        });
                    }
                }
                successCount++;
            } catch (err) { 
                console.error("Error en fila:", row, err);
                errorCount++; 
            }
        }
        await loadData();
        setNotification({ type: 'success', message: `Importación finalizada. ✅ Éxitos: ${successCount} | ❌ Fallidos: ${errorCount}` });
      } catch (err) { setNotification({ type: 'error', message: "Error crítico al procesar el archivo." }); }
      finally { setIsImporting(false); setImportProgress({ current: 0, total: 0, status: '' }); }
    };
    reader.readAsBinaryString(file);
  };

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

  const calculateDaysDiff = (dateStr: string) => {
      const target = new Date(dateStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = today.getTime() - target.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if(loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div></div>;

  return (
      <div className="space-y-6 relative">
          {/* NOTIFICATION */}
          {notification && (
              <div className={`fixed top-4 right-4 z-[120] max-w-sm w-full p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-slideIn ${
                  notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
                  notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                  {notification.type === 'success' ? <CheckCircle size={20} className="text-emerald-500 shrink-0"/> : 
                   notification.type === 'error' ? <AlertTriangle size={20} className="text-rose-500 shrink-0"/> : <Info size={20} className="text-blue-500 shrink-0"/>}
                  <div className="flex-1 text-sm font-medium">{notification.message}</div>
                  <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
              </div>
          )}

          {/* IMPORT PROGRESS OVERLAY */}
          {isImporting && (
              <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6 text-center animate-fadeIn">
                      <div className="relative w-24 h-24 mx-auto">
                          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600">
                              {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                          </div>
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-slate-800">Procesando Importación</h3>
                          <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{importProgress.status}</p>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full transition-all duration-300" 
                            style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                          />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando con la nube...</p>
                  </div>
              </div>
          )}

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
                  <p className="text-slate-500 text-xs font-medium">Gestión de inmuebles, contratos y servicios.</p>
              </div>
              <div className="flex gap-1 bg-white p-1 rounded-lg border shadow-sm overflow-x-auto">
                   {['PROPERTIES', 'UNITS', 'TENANTS', 'CONTRACTS', 'PAYMENTS', 'DELINQUENT', 'SERVICES'].map(tab => (
                       <button 
                         key={tab} 
                         onClick={() => setActiveTab(tab as any)} 
                         className={`px-2.5 py-1.5 rounded-md text-[10px] font-black whitespace-nowrap transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                       >
                           {tabLabels[tab]}
                       </button>
                   ))}
              </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
             <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none text-xs font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                {/* EXCEL ACTIONS GROUP - STANDARDIZED */}
                {['PROPERTIES', 'UNITS', 'TENANTS', 'CONTRACTS', 'SERVICES'].includes(activeTab) && (
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-inner">
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, importMode)} accept=".xlsx, .xls" className="hidden" />
                        
                        {activeTab === 'SERVICES' ? (
                            <div className="flex items-center">
                                <div className="group relative">
                                    <button 
                                        onClick={() => handleDownloadTemplate('STANDARD')} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded transition-all text-[10px] font-black border-r border-slate-200"
                                        title="Descargar Plantilla de Catálogo de Servicios"
                                    >
                                        <FileSpreadsheet size={14} />
                                        <span className="hidden sm:inline">Plantilla Catálogo</span>
                                    </button>
                                </div>
                                <button 
                                    onClick={() => { setImportMode('STANDARD'); fileInputRef.current?.click(); }} 
                                    disabled={isImporting} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded transition-all text-[10px] font-black border-r border-slate-200"
                                >
                                    <Upload size={14} />
                                    <span className="hidden sm:inline">Importar Catálogo</span>
                                </button>
                                <button 
                                    onClick={() => handleDownloadTemplate('SERVICE_PAYMENTS')} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:bg-white rounded transition-all text-[10px] font-black border-r border-slate-200"
                                    title="Descargar Plantilla Simplificada de Pagos"
                                >
                                    <Receipt size={14} />
                                    <span className="hidden sm:inline">Plantilla Pagos</span>
                                </button>
                                <button 
                                    onClick={() => { setImportMode('SERVICE_PAYMENTS'); fileInputRef.current?.click(); }} 
                                    disabled={isImporting} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:bg-white rounded transition-all text-[10px] font-black"
                                >
                                    {isImporting && importMode === 'SERVICE_PAYMENTS' ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                                    <span className="hidden sm:inline">Importar Pagos Masivos</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleDownloadTemplate('STANDARD')} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded transition-all text-[10px] font-black border-r border-slate-200"
                                    title="Descargar Plantilla Maestra con hojas de referencia"
                                >
                                    <FileSpreadsheet size={14} />
                                    <span className="hidden sm:inline">Plantilla Maestra</span>
                                </button>
                                <button 
                                    onClick={() => { setImportMode('STANDARD'); fileInputRef.current?.click(); }} 
                                    disabled={isImporting} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 rounded transition-all text-[10px] font-black"
                                >
                                    {isImporting ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                                    <span className="hidden sm:inline">Importar Masivo</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
             </div>

             {activeTab !== 'PAYMENTS' && activeTab !== 'DELINQUENT' && (
                 <button onClick={() => {
                        if (activeTab === 'PROPERTIES') { setSelectedProperty(null); setShowPropertyModal(true); }
                        else if (activeTab === 'UNITS') { setSelectedApartment(null); setShowApartmentModal(true); }
                        else if (activeTab === 'TENANTS') { setSelectedTenant(null); setShowTenantModal(true); }
                        else if (activeTab === 'CONTRACTS') { setSelectedContract(null); setShowContractModal(true); }
                        else if (activeTab === 'SERVICES') { setSelectedService(null); setShowServiceModal(true); }
                    }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-black flex items-center gap-2 shadow-lg shadow-indigo-200 text-xs hover:bg-indigo-700 transition-all active:scale-95">
                    <Plus size={16}/> Nueva Entrada
                 </button>
             )}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[300px]">
             {activeTab === 'PROPERTIES' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Nombre</th><th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Valor</th><th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {properties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                            <tr key={p.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold text-slate-700">{p.name}</td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-slate-600">{p.value.toLocaleString()} {p.currency}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { setSelectedProperty(p); setShowPropertyModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'PROPERTY', code:p.code, label:p.name})} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'UNITS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Unidad</th><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Propiedad</th><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Estado</th><th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {apartments.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || properties.find(p => p.code === a.propertyCode)?.name.toLowerCase().includes(searchTerm.toLowerCase())).map(a => (
                            <tr key={a.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold text-slate-700">{a.name}</td>
                                <td className="px-6 py-3 text-xs text-slate-500 font-medium">{properties.find(p => p.code === a.propertyCode)?.name || a.propertyCode}</td>
                                <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${a.status === 'RENTED' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.status}</span></td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { setSelectedApartment(a); setShowApartmentModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'APARTMENT', code:a.code, label:a.name})} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'TENANTS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Inquilino</th><th className="px-6 py-3 text-center text-[10px] font-black text-slate-500 uppercase">Estado</th><th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {tenants.filter(t => t.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                            <tr key={t.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold text-slate-700">{t.fullName}</td>
                                <td className="px-6 py-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>ACTIVO</span></td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => { setSelectedTenant(t); setShowTenantModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'TENANT', code:t.code, label:t.fullName})} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'CONTRACTS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Código</th><th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Inquilino</th><th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Monto</th><th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Acciones</th></tr></thead>
                    <tbody className="divide-y">
                        {contracts.filter(c => {
                            const tenantName = tenants.find(t => t.code === c.tenantCode)?.fullName.toLowerCase() || '';
                            return c.code.toLowerCase().includes(searchTerm.toLowerCase()) || tenantName.includes(searchTerm.toLowerCase());
                        }).map(c => (
                            <tr key={c.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-black text-indigo-600 font-mono text-[11px]">{c.code}</td>
                                <td className="px-6 py-3 text-slate-700 font-bold">{tenants.find(t => t.code === c.tenantCode)?.fullName || c.tenantCode}</td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-slate-600">{c.amount.toLocaleString()}</td>
                                <td className="px-6 py-3 text-right flex justify-end gap-1">
                                    <button onClick={() => { setSelectedContract(c); setShowHistoryModal(true); }} title="Historial de Pagos" className="p-1.5 text-slate-400 hover:text-indigo-600"><Clock size={16}/></button>
                                    <button onClick={() => { setSelectedContract(c); setShowContractModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => setItemToDelete({type:'CONTRACT', code:c.code, label:c.code})} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'PAYMENTS' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Unidad / Inquilino</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Próximo Vencimiento</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Monto</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Acciones Rápidas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {contracts.filter(c => {
                            // Triple Validación: Contrato Activo + Inquilino Activo + No Expirado Cronológicamente
                            if (c.status !== 'ACTIVE') return false;
                            
                            const tenant = tenants.find(t => t.code === c.tenantCode);
                            if (!tenant || tenant.status !== 'ACTIVE') return false;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (c.endDate) {
                                const end = new Date(c.endDate);
                                if (end < today) return false;
                            }

                            const tenantName = tenant?.fullName.toLowerCase() || '';
                            const unitName = apartments.find(a => a.code === c.apartmentCode)?.name.toLowerCase() || '';
                            return tenantName.includes(searchTerm.toLowerCase()) || unitName.includes(searchTerm.toLowerCase());
                        }).sort((a,b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate)).map(c => (
                            <tr key={c.code} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3">
                                    <div className="font-bold text-slate-800">{apartments.find(a => a.code === c.apartmentCode)?.name || c.apartmentCode}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">{tenants.find(t => t.code === c.tenantCode)?.fullName || c.tenantCode}</div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-600">
                                        <Calendar size={14} className="text-slate-400" />
                                        {c.nextPaymentDate}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right font-black text-indigo-600">
                                    {c.amount.toLocaleString()} HNL
                                </td>
                                <td className="px-6 py-3 text-right space-x-2">
                                    <button 
                                        onClick={() => { setSelectedContract(c); setPaymentModalDate(undefined); setPaymentModalAmount(undefined); setShowPaymentModal(true); }}
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
                                    >
                                        Pagar Mes
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedContract(c); setShowBulkModal(true); }}
                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors border border-emerald-100 shadow-sm"
                                    >
                                        Cobro Inteligente
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
             {activeTab === 'DELINQUENT' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-rose-50">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-black text-rose-800 uppercase">Unidad / Inquilino</th>
                            <th className="px-6 py-3 text-[10px] font-black text-rose-800 uppercase">Fecha Vencida</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-rose-800 uppercase">Días Atraso</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-rose-800 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {contracts.filter(c => {
                            // Triple Validación: Contrato Activo + Inquilino Activo + No Expirado Cronológicamente + Debe estar Overdue
                            if (c.status !== 'ACTIVE') return false;
                            
                            const tenant = tenants.find(t => t.code === c.tenantCode);
                            if (!tenant || tenant.status !== 'ACTIVE') return false;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            // Si el contrato terminó antes de hoy, no sugerirlo como morosidad activa (se asume fin de relación)
                            if (c.endDate) {
                                const end = new Date(c.endDate);
                                if (end < today) return false;
                            }

                            // La fecha programada debe ser estrictamente menor a hoy
                            const nextPay = new Date(c.nextPaymentDate);
                            if (nextPay >= today) return false;

                            const tenantName = tenant?.fullName.toLowerCase() || '';
                            const unitName = apartments.find(a => a.code === c.apartmentCode)?.name.toLowerCase() || '';
                            return tenantName.includes(searchTerm.toLowerCase()) || unitName.includes(searchTerm.toLowerCase());
                        }).map(c => {
                            const days = calculateDaysDiff(c.nextPaymentDate);
                            return (
                                <tr key={c.code} className="hover:bg-rose-50/30 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="font-bold text-slate-800">{apartments.find(a => a.code === c.apartmentCode)?.name || c.apartmentCode}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-black">{tenants.find(t => t.code === c.tenantCode)?.fullName || c.tenantCode}</div>
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-rose-600 underline decoration-rose-200">
                                        {c.nextPaymentDate}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-black shadow-sm ring-2 ring-rose-200">
                                            {days} DÍAS
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button 
                                            onClick={() => { setSelectedContract(c); setShowHistoryModal(true); }}
                                            className="px-3 py-1.5 bg-white text-slate-700 rounded-lg text-[10px] font-black uppercase hover:bg-slate-50 border border-slate-200 shadow-sm"
                                        >
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {contracts.filter(c => {
                            if (c.status !== 'ACTIVE') return false;
                            const tenant = tenants.find(t => t.code === c.tenantCode);
                            if (!tenant || tenant.status !== 'ACTIVE') return false;
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            if (c.endDate && new Date(c.endDate) < today) return false;
                            return new Date(c.nextPaymentDate) < today;
                        }).length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-emerald-500">
                                        <CheckCircle size={48} className="opacity-20" />
                                        <p className="font-bold text-lg">¡Excelente!</p>
                                        <p className="text-slate-400 text-xs font-medium">Sin morosidad activa.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                 </table>
             )}
             {activeTab === 'SERVICES' && (
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Código</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Servicio</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Propiedad</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Monto Est.</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {services.filter(s => {
                            const propName = properties.find(p => p.code === s.propertyCode)?.name.toLowerCase() || '';
                            return s.name.toLowerCase().includes(searchTerm.toLowerCase()) || propName.includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
                        }).map(s => (
                            <tr key={s.code} className="hover:bg-slate-50">
                                <td className="px-6 py-3">
                                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-black">
                                        {s.code}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-700">{s.name}</td>
                                <td className="px-6 py-3 text-xs text-slate-500 font-medium">{properties.find(p => p.code === s.propertyCode)?.name || s.propertyCode}</td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-slate-600">{s.defaultAmount.toLocaleString()} HNL</td>
                                <td className="px-6 py-3 text-right flex justify-end gap-2">
                                    <button onClick={() => { setSelectedService(s); setShowServiceHistoryModal(true); }} title="Ver Historial" className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase">Historial</button>
                                    <button onClick={() => { setSelectedService(s); setShowServicePaymentModal(true); }} className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-black uppercase">Pagar</button>
                                    <button onClick={() => { setSelectedService(s); setShowServiceModal(true); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                                    <button onClick={() => setItemToDelete({type:'SERVICE', code:s.code, label:s.name})} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
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
