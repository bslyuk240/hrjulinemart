import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { createPayroll } from '../../services/payrollService';
import { X } from 'lucide-react';

export default function PayrollForm({ employees, onClose, onSuccess }) {
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    month: new Date().toLocaleString('en-US', { month: 'long' }),
    year: new Date().getFullYear(),
    basic_salary: '',
    allowances: '0',
    overtime_pay: '0',
    bonus: '0',
    holiday_pay: '0',
    custom_earning_label: '',
    custom_earning_percent: '0',
    custom_earning_amount: '0',
    tax: '0',
    pension: '0',
    loan_repayment: '0',
    insurance: '0',
    loan_deduction: '0',
    custom_deduction_label: '',
    custom_deduction_percent: '0',
    custom_deduction_amount: '0',
    working_days: '0',
    pay_period_start: '',
    pay_period_end: '',
    comments: '',
  });

  const [calculatedTotals, setCalculatedTotals] = useState({
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  useEffect(() => {
    calculateTotals();
  }, [
    formData.basic_salary,
    formData.allowances,
    formData.overtime_pay,
    formData.bonus,
    formData.holiday_pay,
    formData.custom_earning_percent,
    formData.custom_earning_amount,
    formData.tax,
    formData.pension,
    formData.loan_repayment,
    formData.insurance,
    formData.loan_deduction,
    formData.custom_deduction_percent,
    formData.custom_deduction_amount,
  ]);

  const calculateTotals = () => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const overtime = parseFloat(formData.overtime_pay) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const holiday = parseFloat(formData.holiday_pay) || 0;
    const customEarningPercent = parseFloat(formData.custom_earning_percent) || 0;
    const customEarningAmount = parseFloat(formData.custom_earning_amount) || 0;
    const customEarningPercentAmount = (basic * customEarningPercent) / 100;

    const grossSalary =
      basic +
      allowances +
      overtime +
      bonus +
      holiday +
      customEarningAmount +
      customEarningPercentAmount;

    const taxPercent = parseFloat(formData.tax) || 0;
    const pension = parseFloat(formData.pension) || 0;
    const loanRepayment = parseFloat(formData.loan_repayment) || 0;
    const insurance = parseFloat(formData.insurance) || 0;
    const loanDeduction = parseFloat(formData.loan_deduction) || 0;
    const customDeductionPercent = parseFloat(formData.custom_deduction_percent) || 0;
    const customDeductionAmount = parseFloat(formData.custom_deduction_amount) || 0;
    const customDeductionPercentAmount = (grossSalary * customDeductionPercent) / 100;

    const taxAmount = (grossSalary * (taxPercent || 0)) / 100;
    const totalDeductions =
      taxAmount +
      pension +
      loanRepayment +
      insurance +
      loanDeduction +
      customDeductionAmount +
      customDeductionPercentAmount;
    const netSalary = grossSalary - totalDeductions;

    setCalculatedTotals({
      grossSalary,
      totalDeductions,
      netSalary,
    });
  };

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    
    // Convert to string for comparison (handles both number and string IDs)
    const employee = employees.find(emp => emp.id.toString() === employeeId);
    
    if (employee) {
      setSelectedEmployee(employee);
      setFormData(prev => ({
        ...prev,
        employee_id: employee.id,  // Store as original type (number)
        employee_name: employee.name,
        basic_salary: employee.salary || '0',
      }));
    } else {
      // Reset if no employee selected
      setSelectedEmployee(null);
      setFormData(prev => ({
        ...prev,
        employee_id: '',
        employee_name: '',
        basic_salary: '0',
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id) {
      showError('Please select an employee');
      return;
    }

    if (!formData.pay_period_start || !formData.pay_period_end) {
      showError('Please set pay period dates');
      return;
    }

    setLoading(true);

    try {
      const result = await createPayroll(formData);

      if (result.success) {
        showSuccess(`Payslip ${result.data.payslip_no} generated successfully`);
        onSuccess();
      } else {
        showError(result.error || 'Failed to generate payslip');
      }
    } catch (error) {
      showError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount || 0);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Generate Payslip
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Selection */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee *
            </label>
            <select
              value={formData.employee_id ? formData.employee_id.toString() : ''}
              onChange={handleEmployeeChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Choose an employee...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id.toString()}>
                  {employee.name} - {employee.position} ({formatCurrency(employee.salary)})
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month *
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year *
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pay Period */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Period Start *
              </label>
              <input
                type="date"
                name="pay_period_start"
                value={formData.pay_period_start}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Period End *
              </label>
              <input
                type="date"
                name="pay_period_end"
                value={formData.pay_period_end}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Days *
              </label>
              <input
                type="number"
                name="working_days"
                value={formData.working_days}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Earnings Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-4">💰 Earnings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Salary *
                </label>
                <input
                  type="number"
                  name="basic_salary"
                  value={formData.basic_salary}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowances
                </label>
                <input
                  type="number"
                  name="allowances"
                  value={formData.allowances}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overtime Pay
                </label>
                <input
                  type="number"
                  name="overtime_pay"
                  value={formData.overtime_pay}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bonus
                </label>
                <input
                  type="number"
                  name="bonus"
                  value={formData.bonus}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Holiday Pay
                </label>
                <input
                  type="number"
                  name="holiday_pay"
                  value={formData.holiday_pay}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Earning Label
                </label>
                <input
                  type="text"
                  name="custom_earning_label"
                  value={formData.custom_earning_label}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Housing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Earning (%)
                </label>
                <input
                  type="number"
                  name="custom_earning_percent"
                  value={formData.custom_earning_percent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Earning (Amount)
                </label>
                <input
                  type="number"
                  name="custom_earning_amount"
                  value={formData.custom_earning_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Deductions Section */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-4">📉 Deductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax
                </label>
<input
  type="number"
  name="tax"
  value={formData.tax}
  onChange={handleChange}
  min="0"
  max="100"
  step="0.01"
  placeholder="Tax (%)"
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pension
                </label>
                <input
                  type="number"
                  name="pension"
                  value={formData.pension}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Repayment
                </label>
                <input
                  type="number"
                  name="loan_repayment"
                  value={formData.loan_repayment}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance
                </label>
                <input
                  type="number"
                  name="insurance"
                  value={formData.insurance}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Deduction
                </label>
                <input
                  type="number"
                  name="loan_deduction"
                  value={formData.loan_deduction}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Deduction Label
                </label>
                <input
                  type="text"
                  name="custom_deduction_label"
                  value={formData.custom_deduction_label}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Union fee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Deduction (%)
                </label>
                <input
                  type="number"
                  name="custom_deduction_percent"
                  value={formData.custom_deduction_percent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Deduction (Amount)
                </label>
                <input
                  type="number"
                  name="custom_deduction_amount"
                  value={formData.custom_deduction_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Calculated Totals */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Calculated Totals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600">Gross Salary</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculatedTotals.grossSalary)}
                </p>
              </div>

              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculatedTotals.totalDeductions)}
                </p>
              </div>

              <div className="text-center p-4 bg-white rounded-lg border-2 border-green-500">
                <p className="text-sm text-gray-600">Net Salary</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculatedTotals.netSalary)}
                </p>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments
            </label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Additional notes or comments..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Payslip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
