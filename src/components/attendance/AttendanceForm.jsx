import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { markAttendance } from '../../services/attendanceService';
import { X } from 'lucide-react';

export default function AttendanceForm({ employees, onClose, onSuccess, editData }) {
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: editData?.employee_id || '',
    employee_name: editData?.employee_name || '',
    date: editData?.date || new Date().toISOString().split('T')[0],
    clock_in: editData?.clock_in || '',
    clock_out: editData?.clock_out || '',
    status: editData?.status || 'present',
    notes: editData?.notes || '',
  });

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'green' },
    { value: 'absent', label: 'Absent', color: 'red' },
    { value: 'late', label: 'Late', color: 'yellow' },
    { value: 'half_day', label: 'Half Day', color: 'orange' },
    { value: 'on_leave', label: 'On Leave', color: 'blue' },
  ];

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    const employee = employees.find(emp => emp.id === parseInt(employeeId));
    
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

    if (!formData.date) {
      showError('Please select a date');
      return;
    }

    setLoading(true);

    try {
      const result = await markAttendance(formData);

      if (result.success) {
        showSuccess('Attendance marked successfully');
        onSuccess();
      } else {
        showError(result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      showError('An error occurred');
    } finally {
      setLoading(false);
    }
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
            Mark Attendance
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
          {/* Employee Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee *
            </label>
            <select
              value={formData.employee_id}
              onChange={handleEmployeeChange}
              required
              disabled={!!editData}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Choose an employee...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.position}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Fields - Only for present/late status */}
          {(formData.status === 'present' || formData.status === 'late' || formData.status === 'half_day') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clock In Time
                </label>
                <input
                  type="time"
                  name="clock_in"
                  value={formData.clock_in}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clock Out Time
                </label>
                <input
                  type="time"
                  name="clock_out"
                  value={formData.clock_out}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Add any additional notes..."
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
              {loading ? 'Saving...' : 'Mark Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}