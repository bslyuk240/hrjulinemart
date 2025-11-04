import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { submitResignation, updateResignation } from '../../services/resignationService';
import { X, Calendar, FileText, AlertCircle } from 'lucide-react';

export default function ResignationForm({ employees, editData, onClose, onSuccess }) {
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    resignation_date: '',
    last_working_date: '',
    reason: '',
    comments: '',
    status: 'Pending',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editData) {
      setFormData({
        employee_id: editData.employee_id || '',
        employee_name: editData.employee_name || '',
        resignation_date: editData.resignation_date || '',
        last_working_date: editData.last_working_date || '',
        reason: editData.reason || '',
        comments: editData.comments || '',
        status: editData.status || 'Pending',
      });
    }
  }, [editData]);

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    const employee = employees.find(emp => emp.id === employeeId);
    
    setFormData(prev => ({
      ...prev,
      employee_id: employeeId,
      employee_name: employee ? employee.name : '',
    }));
    
    if (errors.employee_id) {
      setErrors(prev => ({ ...prev, employee_id: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }

    if (!formData.resignation_date) {
      newErrors.resignation_date = 'Resignation date is required';
    }

    if (!formData.last_working_date) {
      newErrors.last_working_date = 'Last working date is required';
    }

    if (formData.resignation_date && formData.last_working_date) {
      const resignDate = new Date(formData.resignation_date);
      const lastDay = new Date(formData.last_working_date);
      
      if (lastDay < resignDate) {
        newErrors.last_working_date = 'Last working date must be after resignation date';
      }
    }

    if (!formData.reason || formData.reason.trim().length < 10) {
      newErrors.reason = 'Please provide a reason (minimum 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      let result;
      
      if (editData) {
        result = await updateResignation(editData.id, formData);
      } else {
        result = await submitResignation(formData);
      }

      if (result.success) {
        showSuccess(editData ? 'Resignation updated successfully' : 'Resignation submitted successfully');
        onSuccess();
      } else {
        showError(result.error || 'Failed to save resignation');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateNoticePeriod = () => {
    if (formData.resignation_date && formData.last_working_date) {
      const start = new Date(formData.resignation_date);
      const end = new Date(formData.last_working_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold">
              {editData ? 'Edit Resignation' : 'Submit Resignation'}
            </h2>
            <p className="text-red-100 text-sm mt-1">
              {editData ? 'Update resignation details' : 'Submit employee resignation request'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleEmployeeChange}
              disabled={editData}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
                errors.employee_id ? 'border-red-500' : 'border-gray-300'
              } ${editData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select Employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.position || 'N/A'}
                </option>
              ))}
            </select>
            {errors.employee_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.employee_id}
              </p>
            )}
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resignation Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="resignation_date"
                  value={formData.resignation_date}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
                    errors.resignation_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.resignation_date && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.resignation_date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Working Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="last_working_date"
                  value={formData.last_working_date}
                  onChange={handleChange}
                  min={formData.resignation_date}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
                    errors.last_working_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.last_working_date && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.last_working_date}
                </p>
              )}
            </div>
          </div>

          {/* Notice Period Display */}
          {formData.resignation_date && formData.last_working_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  Notice Period: {calculateNoticePeriod()} days
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Resignation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows="4"
                placeholder="Please provide your reason for resignation..."
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              {errors.reason ? (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.reason}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Minimum 10 characters ({formData.reason.length}/10)
                </p>
              )}
            </div>
          </div>

          {/* Additional Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional information..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
            />
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
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {editData ? 'Update Resignation' : 'Submit Resignation'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}