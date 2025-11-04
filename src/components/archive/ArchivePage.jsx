import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  getAllArchivedEmployees,
  searchArchivedEmployees,
  reinstateEmployee,
  deleteArchivedEmployee,
  getArchiveStats,
  exportArchivedToCSV
} from '../../services/archiveservice';
import { 
  Archive,
  Search,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  Calendar,
  User,
  Mail,
  Briefcase,
  Building,
  FileText,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import Loading from '../common/Loading';
import Modal from '../common/Modal';

export default function ArchivePage() {
  const { showSuccess, showError } = useApp();
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [reinstateModal, setReinstateModal] = useState({ show: false, employee: null });
  const [stats, setStats] = useState({
    total: 0,
    withResignation: 0,
    thisMonth: 0,
    thisYear: 0,
  });

  useEffect(() => {
    fetchArchivedEmployees();
    fetchStats();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchTerm, archivedEmployees]);

  const fetchArchivedEmployees = async () => {
    setLoading(true);
    const result = await getAllArchivedEmployees();
    
    if (result.success) {
      setArchivedEmployees(result.data);
      setFilteredEmployees(result.data);
    } else {
      showError(result.error || 'Failed to fetch archived employees');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getArchiveStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(archivedEmployees);
      return;
    }

    const result = await searchArchivedEmployees(searchTerm);
    if (result.success) {
      setFilteredEmployees(result.data);
    }
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleReinstate = (employee) => {
    setReinstateModal({ show: true, employee });
  };

  const confirmReinstate = async () => {
    const result = await reinstateEmployee(reinstateModal.employee);
    
    if (result.success) {
      showSuccess('Employee reinstated successfully');
      fetchArchivedEmployees();
      fetchStats();
    } else {
      showError(result.error || 'Failed to reinstate employee');
    }
    
    setReinstateModal({ show: false, employee: null });
  };

  const handleDelete = async () => {
    const result = await deleteArchivedEmployee(deleteModal.id);
    
    if (result.success) {
      showSuccess('Archived employee deleted permanently');
      fetchArchivedEmployees();
      fetchStats();
    } else {
      showError(result.error || 'Failed to delete archived employee');
    }
    
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      showError('No data to export');
      return;
    }
    exportArchivedToCSV(filteredEmployees);
    showSuccess('Archived employees exported to CSV');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Archive className="w-8 h-8 text-gray-700" />
              Employee Archive
            </h1>
            <p className="text-gray-600 mt-1">View and manage archived employee records</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5 mr-2" />
            Export to CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Archived</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Archive className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">With Resignation</p>
                <p className="text-3xl font-bold mt-2">{stats.withResignation}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <FileText className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">This Month</p>
                <p className="text-3xl font-bold mt-2">{stats.thisMonth}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">This Year</p>
                <p className="text-3xl font-bold mt-2">{stats.thisYear}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or employee code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Position</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Department</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Archived Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Archive className="w-16 h-16 mb-4" />
                        <p className="text-lg font-medium">No archived employees found</p>
                        <p className="text-sm mt-2">
                          {searchTerm ? 'Try adjusting your search' : 'Archived employees will appear here'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {employee.profile_pic ? (
                            <img
                              src={employee.profile_pic}
                              alt={employee.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {employee.position || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {employee.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {formatDate(employee.archived_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(employee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReinstate(employee)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Reinstate Employee"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ 
                              show: true, 
                              id: employee.id, 
                              name: employee.name 
                            })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Permanently"
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
                <span className="font-medium">{archivedEmployees.length}</span> archived employees
              </p>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedEmployee && (
          <Modal
            title="Archived Employee Details"
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedEmployee(null);
            }}
            size="large"
          >
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <User className="w-4 h-4" /> Name
                    </p>
                    <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" /> Email
                    </p>
                    <p className="font-medium text-gray-900">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> Position
                    </p>
                    <p className="font-medium text-gray-900">{selectedEmployee.position || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building className="w-4 h-4" /> Department
                    </p>
                    <p className="font-medium text-gray-900">{selectedEmployee.department || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Employee Code</p>
                    <p className="font-medium text-gray-900">{selectedEmployee.employee_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Join Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedEmployee.join_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Resignation Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedEmployee.resignation_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Working Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedEmployee.last_working_date)}</p>
                  </div>
                </div>
              </div>

              {/* Resignation Reason */}
              {selectedEmployee.resignation_reason && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Resignation Reason</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900">{selectedEmployee.resignation_reason}</p>
                  </div>
                </div>
              )}

              {/* Archive Notes */}
              {selectedEmployee.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Archive Notes</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900">{selectedEmployee.notes}</p>
                  </div>
                </div>
              )}

              {/* Archive Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Archived on:</span> {formatDate(selectedEmployee.archived_at)}
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <span className="font-medium">Archived by:</span> {selectedEmployee.archived_by || 'System'}
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* Reinstate Modal */}
        {reinstateModal.show && (
          <Modal
            title="Reinstate Employee"
            onClose={() => setReinstateModal({ show: false, employee: null })}
            onConfirm={confirmReinstate}
            confirmText="Reinstate"
            confirmButtonClass="bg-green-600 hover:bg-green-700"
          >
            <div className="space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Important</h4>
                    <p className="text-sm text-amber-800 mt-1">
                      Reinstating this employee will:
                    </p>
                    <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                      <li>Remove them from the archive</li>
                      <li>Add them back to active employees</li>
                      <li>Reset their leave balance to 0</li>
                      <li>Require them to set a new password</li>
                      <li>Assign a new join date (today)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-gray-700">
                Are you sure you want to reinstate{' '}
                <span className="font-semibold">{reinstateModal.employee?.name}</span>?
              </p>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <Modal
            title="Delete Archived Employee"
            onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
            onConfirm={handleDelete}
            confirmText="Delete Permanently"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to permanently delete the archived record for{' '}
                <span className="font-semibold">{deleteModal.name}</span>?
              </p>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">Warning</h4>
                    <p className="text-sm text-red-800 mt-1">
                      This action is permanent and cannot be undone. All archived data for this employee will be lost forever.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}