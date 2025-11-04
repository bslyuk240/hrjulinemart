import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  getAllRequests,
  createRequest,
  uploadReceipt,
  getRequestNotes,
  getReceiptUrl,
  getRequestStats,
  addRequestNote,
  getEmployeeIdByEmail,
} from '../services/requisitionService';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  DollarSign,
  Upload,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  MessageSquare,
} from 'lucide-react';
import Loading from '../components/common/Loading';

export default function Requisitions() {
  const { user, isAdmin } = useAuth();
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0,
    paid: 0,
    totalPaid: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    kind: 'petty_cash',
    amount: '',
    currency: 'NGN',
    needed_by: '',
    description: '',
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [user]);

  useEffect(() => {
    filterRequests();
  }, [searchTerm, filterStatus, filterDate, requests]);

  const fetchRequests = async () => {
    if (!user?.id) return;

    setLoading(true);
    const result = await getAllRequests(user.id, isAdmin());

    if (result.success) {
      setRequests(result.data);
      setFilteredRequests(result.data);
    } else {
      showError(result.error || 'Failed to fetch requests');
    }
    setLoading(false);
  };
  const chatRef = useRef(null);

useEffect(() => {
  if (chatRef.current) {
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }
}, [selectedRequest?.notes]);


  const fetchStats = async () => {
    if (!user?.id) return;

    const result = await getRequestStats(isAdmin(), user.id);
    if (result.success) {
      setStats(result.data);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    if (filterDate) {
      filtered = filtered.filter(req =>
        req.created_at.split('T')[0] === filterDate
      );
    }

    setFilteredRequests(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!formData.description.trim()) {
      showError('Please enter a description');
      return;
    }

    setSubmitting(true);

    try {
      // Create request
      const result = await createRequest(formData, user.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      const requestId = result.data.id;

      // Upload receipts if any
      for (const file of files) {
        await uploadReceipt(requestId, user.id, file);
      }

      showSuccess('Request submitted successfully!');
      setShowForm(false);
      resetForm();
      fetchRequests();
      fetchStats();
    } catch (error) {
      showError(error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kind: 'petty_cash',
      amount: '',
      currency: 'NGN',
      needed_by: '',
      description: '',
    });
    setFiles([]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const viewRequestDetails = async (request) => {
    setSelectedRequest(request);
    
    // Fetch notes
    const notesResult = await getRequestNotes(request.id);
    if (notesResult.success) {
      setSelectedRequest(prev => ({ ...prev, notes: notesResult.data }));
    }
  };

  const formatCurrency = (amount, currency) => {
    return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
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

  const handleReplySubmit = async () => {
  if (!replyText.trim()) return;

  let employeeId = user.employee_id;

  // Fallback: if employee_id is missing, fetch it by email
  if (!employeeId && user.email) {
    employeeId = await getEmployeeIdByEmail(user.email);
  }

  if (!employeeId) {
    alert("Could not find your employee record. Please contact admin.");
    return;
  }

  const result = await addRequestNote(selectedRequest.id, replyText, employeeId);
  if (result.success) {
    setReplyText("");
    const notesResult = await getRequestNotes(selectedRequest.id);
    if (notesResult.success) {
      setSelectedRequest((prev) => ({ ...prev, notes: notesResult.data }));
    }
    alert("Reply sent successfully!");
  } else {
    alert(result.error || "Failed to send reply");
  }
};


  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterDate('');
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requisitions</h1>
          <p className="text-gray-600 mt-1">Submit and track your expense requests</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-xs text-gray-600">Total Requests</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
          </div>
          <p className="text-xs text-gray-600">Pending</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
          </div>
          <p className="text-xs text-gray-600">Approved</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-red-600">{stats.declined}</span>
          </div>
          <p className="text-xs text-gray-600">Declined</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-blue-600">{stats.paid}</span>
          </div>
          <p className="text-xs text-gray-600">Total Received</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
            <option value="Paid">Paid</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-600 mb-4">Submit your first expense request to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Request
            </button>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide">
                    {request.kind === 'petty_cash' ? 'Petty Cash' : 'Reimbursement'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    request.status === 'Paid' ? 'bg-green-400 text-green-900' : 
                    request.status === 'Pending' ? 'bg-yellow-400 text-yellow-900' :
                    request.status === 'Approved' ? 'bg-blue-400 text-blue-900' :
                    'bg-red-400 text-red-900'
                  }`}>
                    {getStatusIcon(request.status)}
                    {request.status}
                  </span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(request.amount, request.currency)}</p>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-900 line-clamp-2">{request.description || 'No description'}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(request.created_at)}
                  </div>
                  {request.needed_by && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Need by: {formatDate(request.needed_by)}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => viewRequestDetails(request)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Request Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              resetForm();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">New Request</h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.kind}
                    onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="petty_cash">Petty Cash (Advance)</option>
                    <option value="reimbursement">Reimbursement</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="KES">KES - Kenyan Shilling</option>
                  </select>
                </div>

                {/* Needed By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Needed By (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.needed_by}
                    onChange={(e) => setFormData({ ...formData, needed_by: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description / Purpose *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  placeholder="What is this request for?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipts / Supporting Documents
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">{files.length} file(s) selected</p>
                    <ul className="text-xs text-gray-500 mt-1">
                      {files.map((file, index) => (
                        <li key={index}>• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRequest(null);
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Request Details</h2>
                  <p className="text-sm text-purple-100 mt-1">
                    {selectedRequest.kind === 'petty_cash' ? 'Petty Cash' : 'Reimbursement'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Amount */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Amount Requested</p>
                <p className="text-4xl font-bold text-gray-900">
                  {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedRequest.status)}`}>
                  {getStatusIcon(selectedRequest.status)}
                  {selectedRequest.status}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Date Submitted</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                </div>

                {selectedRequest.needed_by && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Needed By</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.needed_by)}</p>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {selectedRequest.kind.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-900">{selectedRequest.description || 'No description provided'}</p>
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


              {/* Reply box */}
<div className="border-t pt-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reply</h3>
  <textarea
    value={replyText}
    onChange={(e) => setReplyText(e.target.value)}
    rows="3"
    placeholder="Write your reply..."
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
  ></textarea>
  <button
    onClick={handleReplySubmit}
    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
  >
    Send Reply
  </button>
</div>


              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setSelectedRequest(null)}
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