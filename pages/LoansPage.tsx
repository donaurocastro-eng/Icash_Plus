
import React, { useEffect, useState } from 'react';
import { Plus, FileText, Trash2, Landmark, CheckCircle, Clock, Settings } from 'lucide-react';
import { Loan, LoanFormData, Payment } from '../types';
import { LoanService } from '../services/loanService';
import { TransactionService } from '../services/transactionService';
import { AccountService } from '../services/accountService';
import { CategoryService } from '../services/categoryService';
import LoanModal from '../components/LoanModal';
import LoanPaymentModal from '../components/LoanPaymentModal';
import LoanPlanModal from '../components/LoanPlanModal';
import AmortizationModal from '../components/AmortizationModal';

const LoansPage: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isConfigPlanOpen, setIsConfigPlanOpen] = useState(false);
  
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Payment | undefined>(undefined);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const data = await LoanService.getAll();
      setLoans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: LoanFormData) => {
    setIsSubmitting(true);
    try {
      const newLoan = await LoanService.create(data);
      
      if (confirm(`Préstamo creado. ¿Deseas registrar el ingreso del dinero (${data.initialAmount} ${data.currency}) en una cuenta?`)) {
          const accounts = await AccountService.getAll();
          const targetAccount = accounts.find(a => a.currency === data.currency);
          if (targetAccount) {
              const cats = await CategoryService.getAll();
              let incCat = cats.find(c => c.name.includes('Préstamo') && c.type === 'INGRESO');
              if (!incCat) incCat = cats.find(c => c.type === 'INGRESO');

              await TransactionService.create({
                  date: data.loanDate,
                  amount: data.initialAmount,
                  description: `Desembolso Préstamo ${data.lenderName}`,
                  type: 'INGRESO',
                  categoryCode: incCat?.code || '',
                  accountCode: targetAccount.code,
                  loanId: newLoan.id,
                  loanCode: newLoan.loanCode
              });
              alert("Ingreso registrado correctamente.");
          } else {
              alert("No se encontró una cuenta con la misma moneda para registrar el ingreso automáticamente.");
          }
      }

      await loadLoans();
      setIsModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async (data: any) => {
      setIsSubmitting(true);
      try {
          await LoanService.registerPayment(data);
          await loadLoans();
          setIsPaymentModalOpen(false);
          alert("Pago registrado y plan actualizado.");
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handlePayFromTable = (payment: Payment) => {
      setSelectedInstallment(payment);
      setIsPlanModalOpen(false); // Close table
      setIsPaymentModalOpen(true); // Open payment modal
  };

  const handleGeneratePlan = async (data: any) => {
      setIsSubmitting(true);
      try {
          if (!selectedLoan) return;
          await LoanService.regeneratePlan(selectedLoan.id, data);
          await loadLoans();
          setIsConfigPlanOpen(false);
          alert("Plan de amortización generado exitosamente.");
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (confirm("¿Estás seguro? Esto eliminará el historial del préstamo (pero no las transacciones ya registradas).")) {
          await LoanService.delete(id);
          loadLoans();
      }
  };

  const getNextPayment = (loan: Loan) => {
      if (!loan.paymentPlan) return null;
      return loan.paymentPlan.find(p => p.status === 'PENDING');
  };

  const getProgress = (loan: Loan) => {
      if (!loan.paymentPlan || loan.paymentPlan.length === 0) return 0;
      const paid = loan.paymentPlan.filter(p => p.status === 'PAID').length;
      return (paid / loan.paymentPlan.length) * 100;
  };

  const formatMoney = (amount: number, currency: string) => {
      return amount.toLocaleString('es-HN', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
      });
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Landmark className="text-indigo-600"/> Préstamos</h1>
            <p className="text-slate-500">Gestiona tus deudas y amortizaciones.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md flex items-center gap-2">
            <Plus size={18}/> Nuevo Préstamo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loans.map(loan => {
            const nextPay = getNextPayment(loan);
            const progress = getProgress(loan);
            const hasPlan = loan.paymentPlan && loan.paymentPlan.length > 0;

            return (
                <div key={loan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">{loan.lenderName}</h3>
                            <p className="text-xs text-slate-500 font-mono">{loan.loanCode} {loan.loanNumber ? `| ${loan.loanNumber}` : ''}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-700">{formatMoney(loan.initialAmount, loan.currency)}</p>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{loan.interestRate}% Anual</span>
                        </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Próxima Cuota</p>
                            {nextPay ? (
                                <>
                                    <p className="text-lg font-bold text-slate-700">{formatMoney(nextPay.totalPayment, loan.currency)}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock size={12}/> {new Date(nextPay.dueDate).toLocaleDateString()}
                                    </p>
                                </>
                            ) : (
                                hasPlan ? (
                                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={16}/> Pagado</p>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Sin plan configurado</p>
                                )
                            )}
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Saldo Pendiente</p>
                            <p className="text-lg font-bold text-slate-700">
                                {nextPay ? formatMoney(nextPay.remainingBalance + nextPay.principal, loan.currency) : (hasPlan ? formatMoney(0, loan.currency) : 'N/A')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                        {hasPlan ? (
                            <button 
                                onClick={() => { setSelectedLoan(loan); setSelectedInstallment(nextPay || undefined); setIsPaymentModalOpen(true); }}
                                className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors"
                            >
                                Registrar Pago
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setSelectedLoan(loan); setIsConfigPlanOpen(true); }}
                                className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-lg font-bold text-sm hover:bg-amber-100 transition-colors flex justify-center items-center gap-2"
                            >
                                <Settings size={16}/> Generar Plan
                            </button>
                        )}
                        
                        {hasPlan && (
                            <button 
                                onClick={() => { setSelectedLoan(loan); setIsPlanModalOpen(true); }}
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                                title="Ver Tabla de Amortización"
                            >
                                <FileText size={16}/>
                            </button>
                        )}

                        <button 
                            onClick={() => { setSelectedLoan(loan); setIsConfigPlanOpen(true); }}
                            className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
                            title="Re-configurar Plan"
                        >
                            <Settings size={16}/>
                        </button>

                        <button onClick={() => handleDelete(loan.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                </div>
            );
        })}
        
        {loans.length === 0 && (
            <div className="col-span-1 lg:col-span-2 py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Landmark size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500">No tienes préstamos activos.</p>
                <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Crear uno ahora</button>
            </div>
        )}
      </div>

      <LoanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} />
      
      <LoanPaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        onSubmit={handlePayment} 
        loan={selectedLoan} 
        nextPayment={selectedInstallment} 
        isSubmitting={isSubmitting} 
      />
      
      <LoanPlanModal isOpen={isConfigPlanOpen} onClose={() => setIsConfigPlanOpen(false)} onSubmit={handleGeneratePlan} loan={selectedLoan} isSubmitting={isSubmitting} />
      
      <AmortizationModal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        loan={selectedLoan} 
        onPay={handlePayFromTable}
      />
    </div>
  );
};

export default LoansPage;
