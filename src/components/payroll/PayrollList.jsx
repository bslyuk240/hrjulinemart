import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getAllPayroll, deletePayroll, getPayrollStats } from '../../services/payrollService';
import { generatePayslip } from '../../utils/pdfGenerator';
import { supabase } from '../../services/supabase'; // Fixed import path
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Filter,
  DollarSign,
  Users,
  TrendingUp,
  Calendar
} from 'lucide-react';
import PayrollForm from './PayrollForm';
import Loading from '../common/Loading';
import Modal from '../common/Modal';

export default function PayrollList({ employees }) {
  const { showSuccess, showError } = useApp();
  const [payrolls, setPayrolls] = useState([]);
  const [filteredPayrolls, setFilteredPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [stats, setStats] = useState({
    totalPayrolls: 0,
    currentMonthTotal: 0,
    totalPaid: 0,
    totalGross: 0,
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  useEffect(() => {
    fetchPayrolls();
    fetchStats();
  }, []);

  useEffect(() => {
    filterPayrolls();
  }, [searchTerm, filterMonth, filterYear, payrolls]);

  const fetchPayrolls = async () => {
    setLoading(true);
    const result = await getAllPayroll();
    
    if (result.success) {
      setPayrolls(result.data);
      setFilteredPayrolls(result.data);
    } else {
      showError(result.error || 'Failed to fetch payroll records');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getPayrollStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const filterPayrolls = () => {
    let filtered = [...payrolls];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payroll =>
        payroll.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payroll.payslip_no?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Month filter
    if (filterMonth) {
      filtered = filtered.filter(payroll => payroll.month === filterMonth);
    }

    // Year filter
    if (filterYear) {
      filtered = filtered.filter(payroll => payroll.year === parseInt(filterYear));
    }

    setFilteredPayrolls(filtered);
  };

  const handleDelete = async () => {
    const result = await deletePayroll(deleteModal.id);
    
    if (result.success) {
      showSuccess('Payroll record deleted successfully');
      fetchPayrolls();
      fetchStats();
    } else {
      showError(result.error || 'Failed to delete payroll record');
    }
    
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const handleDownloadPayslip = async (payroll) => {
    try {
      // Fetch employee details from Supabase
      const { data: employee, error } = await supabase
        .from('employees')
        .select('employee_code, name, position, department, bank_name, bank_account, payment_mode')
        .eq('id', payroll.employee_id)
        .single();

      if (error) {
        console.error('Error fetching employee:', error);
        showError('Failed to fetch employee details');
        return;
      }

      // Generate payslip with both payroll and employee data
      await generatePayslip(payroll, employee);
      showSuccess('Payslip downloaded successfully');
    } catch (error) {
      console.error('Error generating payslip:', error);
      showError('Failed to generate payslip');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterMonth('');
    setFilterYear('');
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Manage employee payslips and salary records</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Generate Payslip
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Payrolls</p>
              <p className="text-3xl font-bold mt-2">{stats.totalPayrolls}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Current Month Total</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.currentMonthTotal)}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Calendar className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Paid Out</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total Gross</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalGross)}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or payslip no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Months</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Payslip No.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Period</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Basic Salary</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Gross Salary</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Deductions</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Net Salary</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Generated Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Users className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No payroll records found</p>
                      <p className="text-sm mt-2">Generate your first payslip to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-purple-600">{payroll.payslip_no}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{payroll.employee_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{payroll.month} {payroll.year}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(payroll.pay_period_start)} - {formatDate(payroll.pay_period_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-900">{formatCurrency(payroll.basic_salary)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-green-600">{formatCurrency(payroll.gross_salary)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-red-600">
                        {formatCurrency(
                          (parseFloat(payroll.deductions) || 0) +
                          (parseFloat(payroll.tax) || 0) +
                          (parseFloat(payroll.pension) || 0) +
                          (parseFloat(payroll.loan_repayment) || 0) +
                          (parseFloat(payroll.insurance) || 0) +
                          (parseFloat(payroll.other_deductions) || 0) +
                          (parseFloat(payroll.nhf) || 0) +
                          (parseFloat(payroll.loan_deduction) || 0)
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-blue-600">{formatCurrency(payroll.net_salary)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600">{formatDate(payroll.generated_date)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadPayslip(payroll)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download Payslip"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ 
                            show: true, 
                            id: payroll.id, 
                            name: payroll.employee_name 
                          })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Count */}
        {filteredPayrolls.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredPayrolls.length}</span> of{' '}
              <span className="font-medium">{payrolls.length}</span> records
            </p>
          </div>
        )}
      </div>

      {/* Payroll Form Modal */}
      {showForm && (
        <PayrollForm
          employees={employees}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchPayrolls();
            fetchStats();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <Modal
          title="Delete Payroll Record"
          onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <p className="text-gray-700">
            Are you sure you want to delete the payroll record for{' '}
            <span className="font-semibold">{deleteModal.name}</span>?
          </p>
          <p className="text-red-600 text-sm mt-2">
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
