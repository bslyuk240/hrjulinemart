import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { approveLeaveRequest, rejectLeaveRequest } from '../../services/leaveService';
import { X, CheckCircle, XCircle, Calendar, Clock, User, FileText } from 'lucide-react';

export default function LeaveApproval({ leave, onClose, onSuccess }) {
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(''); // 'approve' or 'reject'

  const handleApprove = async () => {
    setLoading(true);
    setAction('approve');

    const result = await approveLeaveRequest(leave.id);

    if (result.success) {
      showSuccess('Leave request approved successfully');
      onSuccess();
      // Ensure dashboards and profile reflect updated leave balance
      try {
        window.location.reload();
      } catch (_) {}
    } else {
      showError(result.error || 'Failed to approve leave request');
    }

    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    setAction('reject');

    const result = await rejectLeaveRequest(leave.id);

    if (result.success) {
      showSuccess('Leave request rejected');
      onSuccess();
    } else {
      showError(result.error || 'Failed to reject leave request');
    }

    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Leave Request Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold capitalize border-2 ${getStatusColor(leave.status)}`}>
              {leave.status}
            </span>
          </div>

          {/* Employee Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Employee Information</h3>
            </div>
            <p className="text-lg font-medium text-gray-900">{leave.employee_name}</p>
          </div>

          {/* Leave Type */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Leave Type</h3>
            </div>
            <p className="text-lg font-medium text-gray-900">{getTypeLabel(leave.type)}</p>
          </div>

          {/* Date Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Leave Period</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Start Date:</span>
                <span className="font-medium text-gray-900">{formatDate(leave.start_date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">End Date:</span>
                <span className="font-medium text-gray-900">{formatDate(leave.end_date)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-green-300">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-lg font-bold text-green-700">
                  {leave.days} {leave.days === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Reason</h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{leave.reason}</p>
          </div>

          {/* Request Date */}
          {leave.created_at && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Request Submitted</h3>
              </div>
              <p className="text-gray-700">
                {new Date(leave.created_at).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {leave.status === 'pending' && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Close
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {loading && action === 'reject' ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading && action === 'approve' ? 'Approving...' : 'Approve'}
              </button>
            </div>
          )}

          {/* Already Processed */}
          {leave.status !== 'pending' && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
