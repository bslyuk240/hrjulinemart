import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { createLeaveRequest, calculateLeaveDays } from '../../services/leaveService';
import { X } from 'lucide-react';

export default function LeaveForm({ employees, onClose, onSuccess }) {
  const { showSuccess, showError } = useApp();
  const { user, isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    start_date: '',
    end_date: '',
    days: 0,
    type: 'annual',
    reason: '',
  });

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
    { value: 'emergency', label: 'Emergency Leave' },
  ];

  // Auto-fill employee data for regular employees and managers
  useEffect(() => {
    if (!isAdmin()) {
      // For employees and managers, auto-select their own info
      const currentEmployee = employees.find(emp => emp.id === user.id);
      if (currentEmployee) {
        setFormData(prev => ({
          ...prev,
          employee_id: currentEmployee.id,
          employee_name: currentEmployee.name,
        }));
      }
    }
  }, [employees, user, isAdmin]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const days = calculateLeaveDays(formData.start_date, formData.end_date);
      setFormData(prev => ({ ...prev, days }));
    }
  }, [formData.start_date, formData.end_date]);

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    const employee = employees.find(emp => emp.id === employeeId);
    
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employee_id: employee.id,
        employee_name: employee.name,
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

    if (!formData.start_date || !formData.end_date) {
      showError('Please select start and end dates');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      showError('End date must be after start date');
      return;
    }

    if (!formData.reason.trim()) {
      showError('Please provide a reason for leave');
      return;
    }

    setLoading(true);

    try {
      const result = await createLeaveRequest(formData);

      if (result.success) {
        showSuccess('Leave request submitted successfully');
        onSuccess();
      } else {
        showError(result.error || 'Failed to submit leave request');
      }
    } catch (error) {
      showError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get current employee for display
  const currentEmployee = employees.find(emp => emp.id === formData.employee_id);

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
            Request Leave
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Selection - Only show dropdown for Admin */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee *
            </label>
            {isAdmin() ? (
              <select
                value={formData.employee_id}
                onChange={handleEmployeeChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an employee...</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.position} (Balance: {employee.leave_balance || 0} days)
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-3 bg-white border border-gray-300 rounded-lg">
                <p className="font-semibold text-gray-900">{formData.employee_name || user.name}</p>
                {currentEmployee && (
                  <p className="text-sm text-gray-600 mt-1">
                    {currentEmployee.position} • Leave Balance: {currentEmployee.leave_balance || 0} days
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Calculated Days */}
          {formData.days > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Duration:</span>{' '}
                <span className="text-green-700 font-bold text-lg">{formData.days}</span>{' '}
                {formData.days === 1 ? 'day' : 'days'}
              </p>
              {currentEmployee && formData.days > currentEmployee.leave_balance && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Warning: This exceeds your available leave balance
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Leave *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Please provide a detailed reason for your leave request..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}