import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  getAllResignations,
  deleteResignation,
  approveResignation,
  rejectResignation,
  archiveResignation,
  getResignationStats,
  getStatusColor,
  getStatusIcon,
  calculateNoticePeriod
} from '../../services/resignationService';
import { 
  Plus, 
  Search, 
  Filter,
  UserMinus,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  Eye,
  Edit,
  AlertCircle
} from 'lucide-react';
import ResignationForm from './ResignationForm';
import ResignationApproval from './ResignationApproval';
import Loading from '../common/Loading';
import Modal from '../common/Modal';

export default function ResignationList({ employees }) {
  const { showSuccess, showError } = useApp();
  const [resignations, setResignations] = useState([]);
  const [filteredResignations, setFilteredResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [rejectModal, setRejectModal] = useState({ show: false, id: null, name: '', comments: '' });

  const statusOptions = ['Pending', 'Approved', 'Rejected', 'Archived'];

  useEffect(() => {
    fetchResignations();
    fetchStats();
  }, []);

  useEffect(() => {
    filterResignations();
  }, [searchTerm, filterStatus, resignations]);

  const fetchResignations = async () => {
    setLoading(true);
    const result = await getAllResignations();
    
    if (result.success) {
      setResignations(result.data);
      setFilteredResignations(result.data);
    } else {
      showError(result.error || 'Failed to fetch resignations');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getResignationStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const filterResignations = () => {
    let filtered = [...resignations];

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    setFilteredResignations(filtered);
  };

  const handleApprove = (resignation) => {
    setSelectedResignation(resignation);
    setShowApproval(true);
  };

  const handleReject = (resignation) => {
    setRejectModal({
      show: true,
      id: resignation.id,
      name: resignation.employee_name,
      comments: ''
    });
  };

  const confirmReject = async () => {
    const result = await rejectResignation(rejectModal.id, rejectModal.comments);
    
    if (result.success) {
      showSuccess('Resignation rejected');
      fetchResignations();
      fetchStats();
    } else {
      showError(result.error || 'Failed to reject resignation');
    }
    
    setRejectModal({ show: false, id: null, name: '', comments: '' });
  };

  const handleArchive = async (id) => {
    const result = await archiveResignation(id);
    
    if (result.success) {
      showSuccess('Resignation archived');
      fetchResignations();
      fetchStats();
    } else {
      showError(result.error || 'Failed to archive resignation');
    }
  };

  const handleEdit = (resignation) => {
    setSelectedResignation(resignation);
    setShowForm(true);
  };

  const handleDelete = async () => {
    const result = await deleteResignation(deleteModal.id);
    
    if (result.success) {
      showSuccess('Resignation deleted successfully');
      fetchResignations();
      fetchStats();
    } else {
      showError(result.error || 'Failed to delete resignation');
    }
    
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resignation Management</h1>
          <p className="text-gray-600 mt-1">Manage employee resignations and departures</p>
        </div>
        <button
          onClick={() => {
            setSelectedResignation(null);
            setShowForm(true);
          }}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Submit Resignation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Resignations</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <UserMinus className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Pending</p>
              <p className="text-3xl font-bold mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Clock className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Approved</p>
              <p className="text-3xl font-bold mt-2">{stats.approved}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Rejected</p>
              <p className="text-3xl font-bold mt-2">{stats.rejected}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <XCircle className="w-8 h-8" />
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
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
        {filteredResignations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">No resignations found</div>
        ) : (
          filteredResignations.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{r.employee_name}</p>
                  <p className="text-sm text-gray-500">Notice: {calculateNoticePeriod(r.notice_period_start, r.notice_period_end)} days</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(r.status)}`}>
                  {r.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-gray-500">Start</p>
                  <p className="font-medium">{new Date(r.notice_period_start).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p className="text-gray-500">End</p>
                  <p className="font-medium">{new Date(r.notice_period_end).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => { setSelectedResignation(r); setShowApproval(true); }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
                {r.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(r)}
                      className="px-3 py-1.5 text-sm border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(r)}
                      className="px-3 py-1.5 text-sm border border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDeleteModal({ show: true, id: r.id, name: r.employee_name })}
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
            <thead className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Resignation Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Last Working Day</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Notice Period</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResignations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <UserMinus className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No resignations found</p>
                      <p className="text-sm mt-2">Submit a resignation to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResignations.map((resignation) => {
                  const noticePeriod = calculateNoticePeriod(resignation.resignation_date, resignation.last_working_date);
                  
                  return (
                    <tr key={resignation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{resignation.employee_name}</div>
                        {resignation.reason && (
                          <div className="text-sm text-gray-500 truncate max-w-xs" title={resignation.reason}>
                            {resignation.reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {formatDate(resignation.resignation_date)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {formatDate(resignation.last_working_date)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {noticePeriod} days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(resignation.status)}`}>
                          <span>{getStatusIcon(resignation.status)}</span>
                          {resignation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {resignation.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(resignation)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(resignation)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(resignation.status === 'Approved' || resignation.status === 'Rejected') && (
                            <button
                              onClick={() => handleArchive(resignation.id)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteModal({ 
                              show: true, 
                              id: resignation.id, 
                              name: resignation.employee_name 
                            })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Results Count */}
        {filteredResignations.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredResignations.length}</span> of{' '}
              <span className="font-medium">{resignations.length}</span> resignations
            </p>
          </div>
        )}
      </div>

      {/* Resignation Form Modal */}
      {showForm && (
        <ResignationForm
          employees={employees}
          editData={selectedResignation}
          onClose={() => {
            setShowForm(false);
            setSelectedResignation(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedResignation(null);
            fetchResignations();
            fetchStats();
          }}
        />
      )}

      {/* Approval Modal */}
      {showApproval && selectedResignation && (
        <ResignationApproval
          resignation={selectedResignation}
          employees={employees}
          onClose={() => {
            setShowApproval(false);
            setSelectedResignation(null);
          }}
          onSuccess={() => {
            setShowApproval(false);
            setSelectedResignation(null);
            fetchResignations();
            fetchStats();
          }}
        />
      )}

      {/* Reject Modal */}
      {rejectModal.show && (
        <Modal
          title="Reject Resignation"
          onClose={() => setRejectModal({ show: false, id: null, name: '', comments: '' })}
          onConfirm={confirmReject}
          confirmText="Reject"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to reject the resignation from{' '}
              <span className="font-semibold">{rejectModal.name}</span>?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Comments (Optional)
              </label>
              <textarea
                value={rejectModal.comments}
                onChange={(e) => setRejectModal(prev => ({ ...prev, comments: e.target.value }))}
                rows="3"
                placeholder="Add reason for rejection..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <Modal
          title="Delete Resignation"
          onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <p className="text-gray-700">
            Are you sure you want to delete the resignation from{' '}
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
