import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Users,
  Mail,
  Phone,
  Calendar,
  Building,
  DollarSign,
  CreditCard,
  Download,
  User
} from 'lucide-react';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import EmployeeForm from './EmployeeForm';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalSalary: 0,
    departments: 0,
    positions: 0
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
    calculateStats();
  }, [searchTerm, filterDepartment, filterPosition, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Failed to fetch employees');
    }
    setLoading(false);
  };

  const calculateStats = () => {
    const totalSalary = filteredEmployees.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);
    const departments = [...new Set(filteredEmployees.map(emp => emp.department))].filter(Boolean).length;
    const positions = [...new Set(filteredEmployees.map(emp => emp.position))].filter(Boolean).length;

    setStats({
      totalEmployees: filteredEmployees.length,
      totalSalary,
      departments,
      positions
    });
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(employee => employee.department === filterDepartment);
    }

    // Position filter
    if (filterPosition) {
      filtered = filtered.filter(employee => employee.position === filterPosition);
    }

    setFilteredEmployees(filtered);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', deleteModal.id);

      if (error) throw error;

      alert('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }

    setDeleteModal({ show: false, id: null, name: '' });
  };

  const viewEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('');
    setFilterPosition('');
  };

  // Get unique departments and positions for filters
  const departments = [...new Set(employees.map(emp => emp.department))].filter(Boolean);
  const positions = [...new Set(employees.map(emp => emp.position))].filter(Boolean);

  if (loading) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600 mt-1">Manage your workforce and employee records</p>
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setShowForm(true);
          }}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Employees</p>
              <p className="text-3xl font-bold mt-2">{stats.totalEmployees}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Salary</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalSalary)}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Departments</p>
              <p className="text-3xl font-bold mt-2">{stats.departments}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Building className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Positions</p>
              <p className="text-3xl font-bold mt-2">{stats.positions}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Users className="w-8 h-8" />
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Position Filter */}
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Positions</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
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

      {/* Mobile List (cards) */}
      <div className="md:hidden space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">No employees found</div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{emp.name}</p>
                  <p className="text-sm text-gray-500">{emp.employee_code}</p>
                </div>
                <span className="text-xs text-gray-500">{emp.department || '—'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-gray-500">Position</p>
                  <p className="font-medium">{emp.position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Salary</p>
                  <p className="font-medium">{formatCurrency(emp.salary)}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => { setSelectedEmployee(emp); setShowDetailsModal(true); }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
                <button
                  onClick={() => { setEditingEmployee(emp); setShowForm(true); }}
                  className="px-3 py-1.5 text-sm border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteModal({ show: true, id: emp.id, name: emp.name })}
                  className="px-3 py-1.5 text-sm border border-red-600 text-red-700 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Position</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Salary</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Join Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Users className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No employees found</p>
                      <p className="text-sm mt-2">Add your first employee to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    {/* Employee Column with Profile Picture */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                          {employee.profile_pic ? (
                            <img
                              src={employee.profile_pic}
                              alt={employee.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = document.createElement('span');
                                fallback.className = 'text-white font-bold text-sm';
                                fallback.textContent = employee.name[0].toUpperCase();
                                e.target.parentNode.appendChild(fallback);
                              }}
                            />
                          ) : (
                            <span className="text-white font-bold text-sm">
                              {employee.name[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Name and Email */}
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-purple-600">{employee.employee_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">{employee.position || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.department || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate max-w-[150px]">{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-green-600">{formatCurrency(employee.salary)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(employee.join_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewEmployeeDetails(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmployee(employee);
                            setShowForm(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ 
                            show: true, 
                            id: employee.id, 
                            name: employee.name 
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
        {filteredEmployees.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredEmployees.length}</span> of{' '}
              <span className="font-medium">{employees.length}</span> employees
            </p>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <Modal
          title="Employee Details"
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEmployee(null);
          }}
          size="large"
        >
          <div className="space-y-6">
            {/* Profile Picture in Details Modal */}
            <div className="flex items-center space-x-4 pb-4 border-b">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                {selectedEmployee.profile_pic ? (
                  <img
                    src={selectedEmployee.profile_pic}
                    alt={selectedEmployee.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = document.createElement('span');
                      fallback.className = 'text-white font-bold text-2xl';
                      fallback.textContent = selectedEmployee.name[0].toUpperCase();
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h3>
                <p className="text-gray-600">{selectedEmployee.position || 'N/A'}</p>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Employee Code</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.employee_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Full Name</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Position</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Department</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.department || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Join Date</label>
                  <p className="mt-1 text-gray-900">{formatDate(selectedEmployee.join_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Salary</label>
                  <p className="mt-1 text-gray-900 font-semibold">{formatCurrency(selectedEmployee.salary)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Leave Balance</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.leave_balance || 0} days</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Login Access</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedEmployee.can_login ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedEmployee.can_login ? 'Enabled' : 'Disabled'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Bank Name</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.bank_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Number</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.bank_account || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Payment Mode</label>
                  <p className="mt-1 text-gray-900">{selectedEmployee.payment_mode || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Manager Status */}
            {selectedEmployee.is_manager && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manager Information</h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800 font-medium">This employee has manager privileges</p>
                  {selectedEmployee.manager_permissions && (
                    <p className="text-sm text-purple-600 mt-2">
                      Permissions: {JSON.stringify(selectedEmployee.manager_permissions)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <Modal
          title="Delete Employee"
          onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <p className="text-gray-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deleteModal.name}</span>?
          </p>
          <p className="text-red-600 text-sm mt-2">
            This action cannot be undone.
          </p>
        </Modal>
      )}

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm
          editEmployee={editingEmployee}
          onClose={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingEmployee(null);
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
}
