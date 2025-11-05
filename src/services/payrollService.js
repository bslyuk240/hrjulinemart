import { supabase } from './supabase';
import { notifyPayrollGenerated } from './notificationAPI';

const TABLES = {
  PAYROLL: 'payrolls',
  EMPLOYEES: 'employees',
};

const handleSupabaseError = (error) => {
  console.error('Supabase Error:', error);
  return {
    success: false,
    error: error.message || 'An error occurred',
  };
};

export const getAllPayroll = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYROLL)
      .select('*')
      // Order by primary key to ensure newest on top even if created_at is missing
      .order('id', { ascending: false });

    if (error) return handleSupabaseError(error);

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getPayrollById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYROLL)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return handleSupabaseError(error);

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const createPayroll = async (payrollData) => {
  try {
    const basicSalary = parseFloat(payrollData.basic_salary || 0);
    const allowances = parseFloat(payrollData.allowances || 0);
    const overtimePay = parseFloat(payrollData.overtime_pay || 0);
    const bonus = parseFloat(payrollData.bonus || 0);
    const holidayPay = parseFloat(payrollData.holiday_pay || 0);
    const otherEarnings = parseFloat(payrollData.other_earnings || 0);

    const grossSalary = basicSalary + allowances + overtimePay + bonus + holidayPay + otherEarnings;

    const deductions = parseFloat(payrollData.deductions || 0);
    const taxPercent = parseFloat(payrollData.tax || 0);
    const pension = parseFloat(payrollData.pension || 0);
    const loanRepayment = parseFloat(payrollData.loan_repayment || 0);
    const insurance = parseFloat(payrollData.insurance || 0);
    const otherDeductions = parseFloat(payrollData.other_deductions || 0);
    const nhf = parseFloat(payrollData.nhf || 0);
    const loanDeduction = parseFloat(payrollData.loan_deduction || 0);

    const taxAmount = (grossSalary * (taxPercent || 0)) / 100;
    const totalDeductions = deductions + taxAmount + pension + loanRepayment + insurance + otherDeductions + nhf + loanDeduction;
    const netSalary = grossSalary - totalDeductions;

    const payslipNo = await generatePayslipNumber();

    const payroll = {
      employee_id: payrollData.employee_id,
      employee_name: payrollData.employee_name,
      month: payrollData.month,
      year: payrollData.year,
      basic_salary: basicSalary,
      allowances: allowances,
      overtime_pay: overtimePay,
      bonus: bonus,
      holiday_pay: holidayPay,
      other_earnings: otherEarnings,
      deductions: deductions,
      // Store computed tax amount in `tax` column
      tax: taxAmount,
      pension: pension,
      loan_repayment: loanRepayment,
      insurance: insurance,
      other_deductions: otherDeductions,
      nhf: nhf,
      loan_deduction: loanDeduction,
      gross_salary: grossSalary,
      net_salary: netSalary,
      working_days: payrollData.working_days || 0,
      pay_period_start: payrollData.pay_period_start,
      pay_period_end: payrollData.pay_period_end,
      generated_date: new Date().toISOString().split('T')[0],
      payslip_no: payslipNo,
      comments: payrollData.comments || '',
    };

    const { data, error } = await supabase
      .from(TABLES.PAYROLL)
      .insert([payroll])
      .select()
      .single();

    if (error) return handleSupabaseError(error);

    // Notify the employee about the generated payslip
    try {
      await notifyPayrollGenerated([payroll.employee_id], payroll.month, payroll.year);
    } catch (e) {
      // Non-blocking: log and continue
      console.warn('Notification error (payroll):', e);
    }

    return {
      success: true,
      data: data,
      message: 'Payroll created successfully',
    };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

const generatePayslipNumber = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYROLL)
      .select('payslip_no')
      .order('payslip_no', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 'PY0001';
    }

    const lastPayslipNo = data[0].payslip_no;
    const number = parseInt(lastPayslipNo.replace('PY', '')) + 1;
    return `PY${String(number).padStart(4, '0')}`;
  } catch (error) {
    return 'PY0001';
  }
};

export const deletePayroll = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.PAYROLL)
      .delete()
      .eq('id', id);

    if (error) return handleSupabaseError(error);

    return {
      success: true,
      message: 'Payroll deleted successfully',
    };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getPayrollStats = async () => {
  try {
    const { data: allData, error } = await supabase
      .from(TABLES.PAYROLL)
      .select('net_salary, gross_salary, month, year');

    if (error) return handleSupabaseError(error);

    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });
    
    const currentYear = currentDate.getFullYear();
    const currentMonthData = allData?.filter(p => p.month === currentMonth && parseInt(p.year) === currentYear) || [];

    const stats = {
      totalPayrolls: allData?.length || 0,
      currentMonthTotal: currentMonthData.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0),
      totalPaid: allData?.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0),
      totalGross: allData?.reduce((sum, p) => sum + parseFloat(p.gross_salary || 0), 0),
    };

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return handleSupabaseError(error);
  }
};
