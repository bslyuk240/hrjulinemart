import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { approveResignation } from '../../services/resignationService';
import { X, CheckCircle, AlertCircle, User, Calendar, FileText, Archive } from 'lucide-react';

export default function ResignationApproval({ resignation, employees, onClose, onSuccess }) {
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const employee = employees.find(emp => emp.id === resignation.employee_id);

  const handleApprove = async () => {
    if (confirmationText.toLowerCase() !== 'approve') {
      showError('Please type "APPROVE" to confirm');
      return;
    }

    if (!employee) {
      showError('Employee not found');
      return;
    }

    setLoading(true);

    try {
      const employeeData = {
        ...employee,
        archived_by: 'Admin',
        notes: additionalNotes || `Resignation approved on ${new Date().toLocaleDateString()}`,
      };

      const result = await approveResignation(resignation.id, employeeData);

      if (result.success) {
        showSuccess('Resignation approved and employee archived successfully');
        onSuccess();
      } else {
        showError(result.error || 'Failed to approve resignation');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateNoticePeriod = () => {
    if (resignation.resignation_date && resignation.last_working_date) {
      const start = new Date(resignation.resignation_date);
      const end = new Date(resignation.last_working_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!employee) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Employee Not Found</h3>
            <p className="text-gray-600 mb-4">
              The employee associated with this resignation could not be found.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="w-7 h-7" />
              Approve Resignation
            </h2>
            <p className="text-green-100 text-sm mt-1">
              Review and approve this resignation request
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Alert */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Important</h4>
                <p className="text-sm text-amber-800 mt-1">
                  Approving this resignation will:
                </p>
                <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Mark the resignation as approved</li>
                  <li>Archive the employee record</li>
                  <li>Remove the employee from active employees</li>
                  <li>This action cannot be undone (but employee can be reinstated from archive)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Employee Information */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              Employee Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{employee.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee Code</p>
                <p className="font-medium text-gray-900">{employee.employee_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-medium text-gray-900">{employee.position || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-medium text-gray-900">{employee.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{employee.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Join Date</p>
                <p className="font-medium text-gray-900">{formatDate(employee.join_date)}</p>
              </div>
            </div>
          </div>

          {/* Resignation Details */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Resignation Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Resignation Date</p>
                <p className="font-medium text-gray-900">{formatDate(resignation.resignation_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Working Date</p>
                <p className="font-medium text-gray-900">{formatDate(resignation.last_working_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Notice Period</p>
                <p className="font-medium text-blue-600">{calculateNoticePeriod()} days</p>
              </div>
            </div>

            {resignation.reason && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Reason for Resignation</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900">{resignation.reason}</p>
                </div>
              </div>
            )}

            {resignation.comments && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Additional Comments</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900">{resignation.comments}</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Archive Notes (Optional)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows="3"
              placeholder="Add any additional notes for the archive record..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes will be stored with the archived employee record
            </p>
          </div>

          {/* Confirmation */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-red-900 mb-2">
              Type "APPROVE" to confirm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type APPROVE"
              className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-red-600 mt-2">
              This will archive the employee and cannot be undone without manual intervention
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading || confirmationText.toLowerCase() !== 'approve'}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Archive className="w-5 h-5" />
                  Approve & Archive Employee
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}