import React, { useState, useEffect, useRef } from "react";
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  getAllRequests,
  updateRequestStatus,
  deleteRequest,
  getRequestNotes,
  getReceiptUrl,
  getRequestStats,
} from '../services/requisitionService';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  MessageSquare,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import Loading from '../components/common/Loading';

export default function RequisitionManagement() {
  const { user } = useAuth();
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0,
    paid: 0,
    totalPaid: 0,
  });

  const chatRef = useRef(null);

useEffect(() => {
  if (chatRef.current) {
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }
}, [selectedRequest?.notes]);


  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchTerm, filterStatus, filterType, filterDateFrom, filterDateTo, requests]);

  const fetchRequests = async () => {
    setLoading(true);
    const result = await getAllRequests(null, true);

    if (result.success) {
      setRequests(result.data);
      setFilteredRequests(result.data);
    } else {
      showError(result.error || 'Failed to fetch requests');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getRequestStats(true, null);
    if (result.success) {
      setStats(result.data);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchTerm) {
      filtered = filtered.filter(
        req =>
          req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    if (filterType) {
      filtered = filtered.filter(req => req.kind === filterType);
    }

    if (filterDateFrom) {
      filtered = filtered.filter(
        req => new Date(req.created_at) >= new Date(filterDateFrom)
      );
    }

    if (filterDateTo) {
      filtered = filtered.filter(
        req => new Date(req.created_at) <= new Date(filterDateTo + 'T23:59:59')
      );
    }

    setFilteredRequests(filtered);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    setUpdating(true);

    const result = await updateRequestStatus(
  requestId,
  newStatus,
  comment,
  user.employee_id || (user.username === 'admin' ? 8 : user.id)
);



    if (result.success) {
      showSuccess(`Request ${newStatus.toLowerCase()} successfully!`);
      setComment('');
      setShowDetailsModal(false);
      setSelectedRequest(null);
      fetchRequests();
      fetchStats();
    } else {
      showError(result.error || 'Failed to update request');
    }

    setUpdating(false);
  };

  const handleDelete = async (requestId, employeeName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this request from ${employeeName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    const result = await deleteRequest(requestId);

    if (result.success) {
      showSuccess('Request deleted successfully!');
      fetchRequests();
      fetchStats();
    } else {
      showError(result.error || 'Failed to delete request');
    }
  };

  const viewRequestDetails = async (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);

    // Fetch notes
    const notesResult = await getRequestNotes(request.id);
    if (notesResult.success) {
      setSelectedRequest(prev => ({ ...prev, notes: notesResult.data }));
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Employee',
      'Type',
      'Description',
      'Amount',
      'Currency',
      'Status',
      'Needed By',
    ];

    const rows = filteredRequests.map(req => [
      new Date(req.created_at).toLocaleDateString(),
      req.employee?.name || 'Unknown',
      req.kind === 'petty_cash' ? 'Petty Cash' : 'Reimbursement',
      req.description || '',
      req.amount,
      req.currency,
      req.status,
      req.needed_by ? new Date(req.needed_by).toLocaleDateString() : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requisitions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Declined: 'bg-red-100 text-red-800',
      Paid: 'bg-blue-100 text-blue-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Declined':
        return <XCircle className="w-4 h-4" />;
      case 'Paid':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterType('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Requisition Management
          </h1>
          <p className="text-gray-600 mt-1">Review and manage employee expense requests</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg text-sm md:text-base"
        >
          <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-white rounded-lg p-3 md:p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
            <span className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-xs text-gray-600">Total</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
            <span className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</span>
          </div>
          <p className="text-xs text-gray-600">Pending</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            <span className="text-xl md:text-2xl font-bold text-green-600">{stats.approved}</span>
          </div>
          <p className="text-xs text-gray-600">Approved</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
            <span className="text-xl md:text-2xl font-bold text-red-600">{stats.declined}</span>
          </div>
          <p className="text-xs text-gray-600">Declined</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            <span className="text-xl md:text-2xl font-bold text-blue-600">{stats.paid}</span>
          </div>
          <p className="text-xs text-gray-600">Paid</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
            <span className="text-sm md:text-lg font-bold text-purple-600">
              ₦{stats.totalPaid.toFixed(0)}
            </span>
          </div>
          <p className="text-xs text-gray-600">Total Paid</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
            <option value="Paid">Paid</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">All Types</option>
            <option value="petty_cash">Petty Cash</option>
            <option value="reimbursement">Reimbursement</option>
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="From Date"
          />

          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="To Date"
          />
        </div>

        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No requests found</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {request.employee?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{request.employee?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                      {request.kind.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {request.description || 'No description'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(request.amount, request.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewRequestDetails(request)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(request.id, request.employee?.name)}
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
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No requests found</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-md p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{request.employee?.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(request.created_at)}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                    request.status
                  )}`}
                >
                  {getStatusIcon(request.status)}
                  {request.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">
                    {request.kind.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency(request.amount, request.currency)}
                  </span>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Description:</p>
                  <p className="text-gray-900 line-clamp-2">{request.description}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => viewRequestDetails(request)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleDelete(request.id, request.employee?.name)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedRequest(null);
              setComment('');
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Request Details</h2>
                  <p className="text-sm text-purple-100 mt-1">
                    ID: #{selectedRequest.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                    setComment('');
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {selectedRequest.employee?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {selectedRequest.employee?.name || 'Unknown Employee'}
                  </p>
                  <p className="text-sm text-gray-600">{selectedRequest.employee?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedRequest.employee?.position || 'No position'} •{' '}
                    {selectedRequest.employee?.employee_code || 'No code'}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Amount Requested</p>
                <p className="text-4xl font-bold text-gray-900">
                  {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(
                      selectedRequest.status
                    )}`}
                  >
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {selectedRequest.kind.replace('_', ' ')}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Date Submitted</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(selectedRequest.created_at)}
                  </p>
                </div>

                {selectedRequest.needed_by && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Needed By</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(selectedRequest.needed_by)}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-900">
                  {selectedRequest.description || 'No description provided'}
                </p>
              </div>

              {/* Comments/Notes */}
              {selectedRequest.notes && selectedRequest.notes.length > 0 && (
  <div className="border-t pt-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <MessageSquare className="w-5 h-5" />
      Conversation Thread
    </h3>

    <div
      ref={chatRef}
      className="space-y-4 max-h-[300px] overflow-y-auto pr-2"
    >
      {selectedRequest.notes
        .filter((note) => !note.note.startsWith("receipt:"))
        .map((note, index) => {
          const isAdmin =
            note.author?.position === "System Administrator" ||
            note.author?.name?.toLowerCase() === "admin";

          return (
            <div
              key={index}
              className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
            >
              <div
  className={`max-w-[75%] px-4 py-2 ml-1 rounded-2xl shadow ${
    isAdmin
      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none"
      : "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 border border-blue-200 rounded-bl-none"
  }`}
>

                <p className="text-sm leading-relaxed">{note.note}</p>
                <p
                  className={`text-xs mt-1 ${
                    isAdmin ? "text-purple-100" : "text-gray-500"
                  }`}
                >
                  {note.author?.name || "Admin"} •{" "}
                  {new Date(note.created_at).toLocaleString("en-GB")}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  </div>
)}


              {/* Update Status Section */}
              {selectedRequest.status !== 'Paid' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Update Status
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Comment (Optional)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows="3"
                        placeholder="Add a comment or reason for your decision..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {selectedRequest.status === 'Pending' && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusUpdate(selectedRequest.id, 'Approved')
                            }
                            disabled={updating}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleStatusUpdate(selectedRequest.id, 'Declined')
                            }
                            disabled={updating}
                            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}

                      {selectedRequest.status === 'Approved' && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(selectedRequest.id, 'Paid')
                          }
                          disabled={updating}
                          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark as Paid
                        </button>
                      )}

                      {(selectedRequest.status === 'Approved' ||
                        selectedRequest.status === 'Declined') && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(selectedRequest.id, 'Pending')
                          }
                          disabled={updating}
                          className="flex items-center gap-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Clock className="w-4 h-4" />
                          Revert to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                    setComment('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}