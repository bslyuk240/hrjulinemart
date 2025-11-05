import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllLeaveRequests, 
  deleteLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest 
} from '../../services/leaveService';
import { 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Trash2,
  Eye
} from 'lucide-react';
import LeaveForm from './LeaveForm';
import LeaveApproval from './LeaveApproval';
import Loading from '../common/Loading';
import Modal from '../common/Modal';

export default function LeaveList({ employees }) {
  const { showSuccess, showError } = useApp();
  const { user, isAdmin, isManager } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [showDetails, setShowDetails] = useState(false);

  const leaveTypes = [
    'annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid', 'emergency'
  ];

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    filterLeaves();
  }, [searchTerm, filterStatus, filterType, leaves]);

  const fetchLeaves = async () => {
    setLoading(true);
    const result = await getAllLeaveRequests();
    
    if (result.success) {
      let leavesData = result.data;

      // Only show user's leaves for employees
      if (!isAdmin() && !isManager()) {
        leavesData = leavesData.filter(leave => leave.employee_id === user.id);
      }

      setLeaves(leavesData);
      setFilteredLeaves(leavesData);
      calculateStats(leavesData);
    } else {
      showError(result.error || 'Failed to fetch leave requests');
    }
    setLoading(false);
  };

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      pending: data.filter(l => l.status === 'pending').length,
      approved: data.filter(l => l.status === 'approved').length,
      rejected: data.filter(l => l.status === 'rejected').length,
    });
  };

  const filterLeaves = () => {
    let filtered = [...leaves];

    if (searchTerm) {
      filtered = filtered.filter(leave =>
        leave.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) filtered = filtered.filter(leave => leave.status === filterStatus);
    if (filterType) filtered = filtered.filter(leave => leave.type === filterType);

    setFilteredLeaves(filtered);
  };

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setShowDetails(true);
  };

  const handleDelete = async () => {
    const result = await deleteLeaveRequest(deleteModal.id);
    
    if (result.success) {
      showSuccess('Leave request deleted successfully');
      fetchLeaves();
    } else {
      showError(result.error || 'Failed to delete leave request');
    }
    
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const handleQuickApprove = async (id) => {
    const result = await approveLeaveRequest(id);
    if (result.success) {
      showSuccess('Leave request approved');
      fetchLeaves();
    } else showError(result.error || 'Failed to approve');
  };

  const handleQuickReject = async (id) => {
    const result = await rejectLeaveRequest(id);
    if (result.success) {
      showSuccess('Leave request rejected');
      fetchLeaves();
    } else showError(result.error || 'Failed to reject');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type) => {
    const labels = {
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      casual: 'Casual Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      unpaid: 'Unpaid Leave',
      emergency: 'Emergency Leave',
    };
    return labels[type] || type;
  };

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {isAdmin() || isManager() ? 'Manage employee leave requests and approvals' : 'Request and track your leave'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Request Leave
        </button>
      </div>

      {/* Stats Grid — Responsive same as Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 md:p-5 lg:p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs md:text-sm">Total Requests</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">
              <Calendar className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 md:p-5 lg:p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-xs md:text-sm">Pending</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">
              <Clock className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 md:p-5 lg:p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs md:text-sm">Approved</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.approved}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-3 md:p-5 lg:p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs md:text-sm">Rejected</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.rejected}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">
              <XCircle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-5">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          {(isAdmin() || isManager()) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
              />
            </div>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">All Types</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>
                {getTypeLabel(type)}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('');
              setFilterType('');
            }}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm md:text-base"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Mobile List (cards) */}
      <div className="md:hidden space-y-3">
        {filteredLeaves.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">No leave requests found</div>
        ) : (
          filteredLeaves.map((leave) => (
            <div key={leave.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  {(isAdmin() || isManager()) && (
                    <p className="text-base font-semibold text-gray-900">{leave.employee_name}</p>
                  )}
                  <p className="text-sm text-gray-500">{getTypeLabel(leave.type)}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(leave.status)}`}>
                  {leave.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-gray-500">Start</p>
                  <p className="font-medium">{formatDate(leave.start_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500">End</p>
                  <p className="font-medium">{formatDate(leave.end_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Days</p>
                  <p className="font-medium">{leave.days}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleViewDetails(leave)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
                {/* Admin quick actions on mobile */}
                {isAdmin() && leave.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleQuickApprove(leave.id)}
                      className="ml-2 px-3 py-1.5 text-sm border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleQuickReject(leave.id)}
                      className="ml-2 px-3 py-1.5 text-sm border border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {(leave.employee_id === user.id || isAdmin()) && (
                  <button
                    onClick={() => setDeleteModal({ show: true, id: leave.id, name: leave.employee_name })}
                    className="ml-2 px-3 py-1.5 text-sm border border-red-600 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedLeave && (
        <Modal
          title="Leave Details"
          onClose={() => { setShowDetails(false); setSelectedLeave(null); }}
          onConfirm={() => { setShowDetails(false); setSelectedLeave(null); }}
          confirmText="Close"
          cancelText="Back"
        >
          <div className="space-y-2 text-sm">
            {(isAdmin() || isManager()) && (
              <p><span className="text-gray-500">Employee:</span> <span className="font-medium">{selectedLeave.employee_name}</span></p>
            )}
            <p><span className="text-gray-500">Type:</span> <span className="font-medium">{getTypeLabel(selectedLeave.type)}</span></p>
            <p><span className="text-gray-500">Start:</span> <span className="font-medium">{formatDate(selectedLeave.start_date)}</span></p>
            <p><span className="text-gray-500">End:</span> <span className="font-medium">{formatDate(selectedLeave.end_date)}</span></p>
            <p><span className="text-gray-500">Days:</span> <span className="font-medium">{selectedLeave.days}</span></p>
            <p><span className="text-gray-500">Reason:</span> <span className="font-medium">{selectedLeave.reason}</span></p>
            <p>
              <span className="text-gray-500">Status:</span>{' '}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(selectedLeave.status)}`}>
                {selectedLeave.status}
              </span>
            </p>
          </div>
        </Modal>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                {(isAdmin() || isManager()) && (
                  <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Start Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">End Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Days</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Reason</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin() || isManager() ? "8" : "7"} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Calendar className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No leave requests found</p>
                      <p className="text-sm mt-2">Create your first leave request to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    {(isAdmin() || isManager()) && (
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{leave.employee_name}</div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getTypeLabel(leave.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(leave.start_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(leave.end_date)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-blue-600">{leave.days}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(leave)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Only admin can approve/reject */}
                        {isAdmin() && leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(leave.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleQuickReject(leave.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {/* Only show delete for own requests or admin */}
                        {(leave.employee_id === user.id || isAdmin()) && (
                          <button
                            onClick={() => setDeleteModal({ 
                              show: true, 
                              id: leave.id, 
                              name: leave.employee_name 
                            })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Count */}
        {filteredLeaves.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredLeaves.length}</span> of{' '}
              <span className="font-medium">{leaves.length}</span> records
            </p>
          </div>
        )}
      </div>

      {/* Leave Form Modal */}
      {showForm && (
        <LeaveForm
          employees={employees}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchLeaves();
          }}
        />
      )}

      {/* Leave Approval Modal */}
      {showApproval && selectedLeave && (
        <LeaveApproval
          leave={selectedLeave}
          onClose={() => {
            setShowApproval(false);
            setSelectedLeave(null);
          }}
          onSuccess={() => {
            setShowApproval(false);
            setSelectedLeave(null);
            fetchLeaves();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <Modal
          title="Delete Leave Request"
          onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <p className="text-gray-700">
            Are you sure you want to delete the leave request for{' '}
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
