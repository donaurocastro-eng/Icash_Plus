
import { Loan, LoanFormData, Payment, LoanPaymentData, TransactionFormData } from '../types';
import { db } from './db';
import { TransactionService } from './transactionService';
import { AccountService } from './accountService';
import { CategoryService } from './categoryService';

const STORAGE_KEY = 'icash_plus_loans';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- UTILS ---

const generateNextCode = async (): Promise<string> => {
  if (db.isConfigured()) {
      const rows = await db.query('SELECT loan_code FROM loans');
      let maxId = 0;
      rows.forEach((r: any) => {
          if (r.loan_code && r.loan_code.startsWith('PREST-')) {
              const parts = r.loan_code.split('-');
              if (parts.length === 2) {
                  const num = parseInt(parts[1], 10);
                  if (!isNaN(num) && num > maxId) maxId = num;
              }
          }
      });
      const nextId = maxId + 1;
      return `PREST-${nextId.toString().padStart(3, '0')}`;
  } else {
      // Local fallback
      return `PREST-${Date.now().toString().slice(-4)}`;
  }
};

const toDateString = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val).split('T')[0];
};

export const LoanService = {
  // 1. Calculate Amortization
  generateAmortizationSchedule: (principal: number, annualRate: number, termMonths: number, startDateStr: string, monthlyInsurance: number = 0): Payment[] => {
    const monthlyRate = annualRate / 100 / 12;
    // Formula for PMT: P * r * (1+r)^n / ((1+r)^n - 1)
    let pmt = 0;
    if (monthlyRate > 0) {
        pmt = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    } else {
        pmt = principal / termMonths;
    }
    
    let balance = principal;
    const schedule: Payment[] = [];
    let currentDate = new Date(startDateStr);
    // Adjust for timezone to avoid date shifting
    currentDate = new Date(currentDate.valueOf() + currentDate.getTimezoneOffset() * 60000);

    for (let i = 1; i <= termMonths; i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        const interest = balance * monthlyRate;
        const principalPayment = pmt - interest;
        balance -= principalPayment;

        if (balance < 0.01) balance = 0;

        schedule.push({
            paymentNumber: i,
            dueDate: currentDate.toISOString().split('T')[0],
            principal: principalPayment,
            interest: interest,
            insurance: monthlyInsurance,
            totalPayment: principalPayment + interest + monthlyInsurance,
            remainingBalance: balance,
            status: 'PENDING'
        });
    }
    return schedule;
  },

  getAll: async (): Promise<Loan[]> => {
    if (db.isConfigured()) {
      const rows = await db.query(`
        SELECT 
            id, loan_code as "loanCode", lender_name as "lenderName", loan_number as "loanNumber",
            initial_amount as "initialAmount", currency, loan_date as "loanDate", notes, is_archived as "isArchived",
            interest_rate as "interestRate", term, monthly_insurance as "monthlyInsurance", payment_plan as "paymentPlan",
            created_at as "createdAt"
        FROM loans
        ORDER BY is_archived ASC, loan_date DESC
      `);
      return rows.map(r => ({
          ...r,
          initialAmount: Number(r.initialAmount),
          interestRate: Number(r.interestRate),
          term: Number(r.term),
          monthlyInsurance: Number(r.monthlyInsurance),
          loanDate: toDateString(r.loanDate),
          paymentPlan: r.paymentPlan || []
      }));
    } else {
      await delay(300);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  create: async (data: LoanFormData): Promise<Loan> => {
    const loanCode = await generateNextCode();
    let paymentPlan: Payment[] = [];

    if (data.term) {
        paymentPlan = LoanService.generateAmortizationSchedule(
            data.initialAmount, 
            data.interestRate || 0, 
            data.term, 
            data.loanDate, 
            data.monthlyInsurance || 0
        );
    }

    if (db.isConfigured()) {
        const result = await db.query(`
            INSERT INTO loans (
                loan_code, lender_name, loan_number, initial_amount, currency, loan_date, notes, 
                interest_rate, term, monthly_insurance, payment_plan, is_archived
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
            RETURNING id, created_at
        `, [
            loanCode, data.lenderName, data.loanNumber, data.initialAmount, data.currency, data.loanDate, data.notes,
            data.interestRate, data.term, data.monthlyInsurance, JSON.stringify(paymentPlan)
        ]);
        
        return {
            id: result[0].id,
            loanCode,
            ...data,
            isArchived: false,
            paymentPlan,
            createdAt: result[0].created_at
        };
    } else {
        await delay(300);
        const existing = await LoanService.getAll();
        const newLoan: Loan = {
            id: crypto.randomUUID(),
            loanCode,
            ...data,
            isArchived: false,
            paymentPlan,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, newLoan]));
        return newLoan;
    }
  },

  update: async (id: string, data: Partial<Loan>): Promise<void> => {
      if (db.isConfigured()) {
          // Dynamic Query Builder to update only changed fields efficiently
          const fields: string[] = [];
          const values: any[] = [];
          let idx = 1;

          if (data.lenderName !== undefined) { fields.push(`lender_name=$${idx++}`); values.push(data.lenderName); }
          if (data.loanNumber !== undefined) { fields.push(`loan_number=$${idx++}`); values.push(data.loanNumber); }
          if (data.initialAmount !== undefined) { fields.push(`initial_amount=$${idx++}`); values.push(data.initialAmount); }
          if (data.currency !== undefined) { fields.push(`currency=$${idx++}`); values.push(data.currency); }
          if (data.loanDate !== undefined) { fields.push(`loan_date=$${idx++}`); values.push(data.loanDate); }
          if (data.notes !== undefined) { fields.push(`notes=$${idx++}`); values.push(data.notes); }
          if (data.isArchived !== undefined) { fields.push(`is_archived=$${idx++}`); values.push(data.isArchived); }
          
          if (data.interestRate !== undefined) { fields.push(`interest_rate=$${idx++}`); values.push(data.interestRate); }
          if (data.term !== undefined) { fields.push(`term=$${idx++}`); values.push(data.term); }
          if (data.monthlyInsurance !== undefined) { fields.push(`monthly_insurance=$${idx++}`); values.push(data.monthlyInsurance); }
          
          if (data.paymentPlan !== undefined) { fields.push(`payment_plan=$${idx++}`); values.push(JSON.stringify(data.paymentPlan)); }

          if (fields.length === 0) return;

          values.push(id);
          const query = `UPDATE loans SET ${fields.join(', ')} WHERE id=$${idx}`;
          
          await db.query(query, values);
      } else {
          const loans = await LoanService.getAll();
          const idx = loans.findIndex(l => l.id === id);
          if (idx !== -1) {
              loans[idx] = { ...loans[idx], ...data };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
          }
      }
  },

  regeneratePlan: async (loanId: string, params: { interestRate: number, term: number, monthlyInsurance: number, startDate: string, amount: number }): Promise<void> => {
      const schedule = LoanService.generateAmortizationSchedule(
          params.amount,
          params.interestRate,
          params.term,
          params.startDate,
          params.monthlyInsurance
      );

      await LoanService.update(loanId, {
          interestRate: params.interestRate,
          term: params.term,
          monthlyInsurance: params.monthlyInsurance,
          paymentPlan: schedule
      });
  },

  delete: async (id: string): Promise<void> => {
      if (db.isConfigured()) {
          await db.query('DELETE FROM loans WHERE id=$1', [id]);
      } else {
          let loans = await LoanService.getAll();
          loans = loans.filter(l => l.id !== id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
      }
  },

  // Handles the payment logic: Transaction creation + Plan Update + Balance Update
  registerPayment: async (details: LoanPaymentData): Promise<void> => {
      const { loan, amount, extraPrincipal, fromAccountId, date, paymentNumber } = details;
      
      const accounts = await AccountService.getAll();
      const account = accounts.find(a => a.code === fromAccountId);
      if (!account) throw new Error("Cuenta no encontrada");

      const totalTxAmount = amount + extraPrincipal;

      // 1. Identify specific Installment to calculate Split (Capital vs Interest)
      let interestPart = 0;
      let insurancePart = 0;
      let capitalPart = 0;

      if (paymentNumber && loan.paymentPlan) {
          const installment = loan.paymentPlan.find(p => p.paymentNumber === paymentNumber);
          if (installment) {
              interestPart = installment.interest;
              insurancePart = installment.insurance;
          }
      }

      // Costo Financiero = Interés + Seguro
      const financialCost = interestPart + insurancePart;
      
      // Capital = Todo lo pagado menos el costo financiero (incluye abono extra)
      // Nota: Si por alguna razón el usuario edita el monto para pagar MENOS que los intereses, 
      // priorizamos cubrir intereses (banca estándar).
      capitalPart = totalTxAmount - financialCost;
      if (capitalPart < 0) capitalPart = 0; 

      // 2. Fetch Categories (Prioritizing User Requests)
      const categories = await CategoryService.getAll();
      
      // CAT-EXP-011: Pago de Préstamo (Capital)
      let catCapital = categories.find(c => c.code === 'CAT-EXP-011');
      if (!catCapital) catCapital = categories.find(c => c.name.includes('Préstamo') && c.type === 'GASTO');
      if (!catCapital) catCapital = categories.find(c => c.type === 'GASTO');

      // CAT-EXP-014: Impuestos y Gastos Financieros (Interés)
      let catInterest = categories.find(c => c.code === 'CAT-EXP-014');
      if (!catInterest) catInterest = categories.find(c => (c.name.includes('Financiero') || c.name.includes('Interés')) && c.type === 'GASTO');
      if (!catInterest) catInterest = categories.find(c => c.type === 'GASTO');

      // 3. Create Transaction 1: Financial Cost (Intereses + Seguros)
      if (financialCost > 0.01 && catInterest) {
          await TransactionService.create({
              date: date,
              description: `Intereses y Seguros - Préstamo ${loan.lenderName} (Cuota #${paymentNumber})`,
              amount: financialCost,
              type: 'GASTO',
              categoryCode: catInterest.code,
              accountCode: fromAccountId,
              loanId: loan.id,
              loanCode: loan.loanCode,
              paymentNumber: paymentNumber
          });
      }

      // 4. Create Transaction 2: Capital (Principal + Extra)
      if (capitalPart > 0.01 && catCapital) {
          await TransactionService.create({
              date: date,
              description: `Abono a Capital - Préstamo ${loan.lenderName}` + (paymentNumber ? ` (Cuota #${paymentNumber})` : '') + (extraPrincipal > 0 ? ' + Extra' : ''),
              amount: capitalPart,
              type: 'GASTO',
              categoryCode: catCapital.code,
              accountCode: fromAccountId,
              loanId: loan.id,
              loanCode: loan.loanCode,
              paymentNumber: paymentNumber
          });
      }

      // Fallback: If for some reason we couldn't split (e.g. no plan data), create single tx
      if (financialCost <= 0.01 && capitalPart <= 0.01) {
           await TransactionService.create({
              date: date,
              description: `Pago Préstamo ${loan.lenderName}` + (paymentNumber ? ` (Cuota #${paymentNumber})` : ''),
              amount: totalTxAmount,
              type: 'GASTO',
              categoryCode: catCapital?.code || '',
              accountCode: fromAccountId,
              loanId: loan.id,
              loanCode: loan.loanCode,
              paymentNumber: paymentNumber
          });
      }

      // 5. Update Payment Plan (Same Logic as before)
      if (paymentNumber && loan.paymentPlan) {
          const paymentIndex = loan.paymentPlan.findIndex(p => p.paymentNumber === paymentNumber);
          if (paymentIndex === -1) return;

          let finalPlan: Payment[] = [];

          if (extraPrincipal > 0 && loan.interestRate !== undefined && loan.term) {
              // Re-calculate amortization
              const currentPayment = loan.paymentPlan[paymentIndex];
              const newPrincipalForRecalc = currentPayment.remainingBalance - extraPrincipal;

              // Mark current and past as paid
              const paidPortion = loan.paymentPlan.slice(0, paymentIndex + 1).map((p, idx) => {
                  if (idx < paymentIndex && p.status !== 'PAID') {
                      return { ...p, status: 'PAID' as const, paidAmount: p.totalPayment, paidDate: date };
                  }
                  if (idx === paymentIndex) {
                      return { ...p, status: 'PAID' as const, paidAmount: amount, paidDate: date, extraPrincipalPaid: extraPrincipal };
                  }
                  return p;
              });

              if (newPrincipalForRecalc <= 0.01) {
                  paidPortion[paidPortion.length - 1].remainingBalance = 0;
                  finalPlan = paidPortion;
              } else {
                  // Generate new future
                  const monthlyInsurance = loan.monthlyInsurance || 0;
                  const monthlyRate = loan.interestRate / 100 / 12;
                  const standardPayment = loan.paymentPlan[0]; // Assume fixed payment
                  const originalMonthlyTotal = standardPayment ? standardPayment.totalPayment : amount; 
                  
                  const newSchedulePart: Payment[] = [];
                  let remainingBalance = newPrincipalForRecalc;
                  let currentPaymentNum = paymentNumber;
                  let lastDueDate = new Date(currentPayment.dueDate);
                  lastDueDate = new Date(lastDueDate.valueOf() + lastDueDate.getTimezoneOffset() * 60000);

                  // Safety loop
                  let safety = 0;
                  while (remainingBalance > 0.01 && safety < 360) {
                      safety++;
                      currentPaymentNum++;
                      lastDueDate.setMonth(lastDueDate.getMonth() + 1);
                      
                      const interestForMonth = remainingBalance * monthlyRate;
                      let principalForMonth = (originalMonthlyTotal - monthlyInsurance) - interestForMonth;
                      
                      if (principalForMonth > remainingBalance) {
                          principalForMonth = remainingBalance;
                      }

                      remainingBalance -= principalForMonth;
                      if (remainingBalance < 0) remainingBalance = 0;

                      newSchedulePart.push({
                          paymentNumber: currentPaymentNum,
                          dueDate: lastDueDate.toISOString().split('T')[0],
                          principal: principalForMonth,
                          interest: interestForMonth,
                          insurance: monthlyInsurance,
                          totalPayment: principalForMonth + interestForMonth + monthlyInsurance,
                          remainingBalance: remainingBalance,
                          status: 'PENDING'
                      });
                  }
                  finalPlan = [...paidPortion, ...newSchedulePart];
              }
          } else {
              // Just mark as paid, no recalc
              finalPlan = loan.paymentPlan.map(p => {
                  if (p.paymentNumber === paymentNumber) {
                      return { ...p, status: 'PAID' as const, paidAmount: amount, paidDate: date };
                  }
                  return p;
              });
          }

          // Save Updated Plan
          await LoanService.update(loan.id, { paymentPlan: finalPlan });
      }
  }
};
