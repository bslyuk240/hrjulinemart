import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  createPerformanceRecord, 
  updatePerformanceRecord,
  calculateOverallScore 
} from '../../services/performanceService';
import { X, Star } from 'lucide-react';

export default function PerformanceForm({ employees, editData, onClose, onSuccess }) {
  const { showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: editData?.employee_id || '',
    employee_name: editData?.employee_name || '',
    date: editData?.date || new Date().toISOString().split('T')[0],
    period_type: editData?.period_type || 'Weekly',
    quality_rating: editData?.quality_rating || 3,
    productivity_rating: editData?.productivity_rating || 3,
    teamwork_rating: editData?.teamwork_rating || 3,
    communication_rating: editData?.communication_rating || 3,
    punctuality_rating: editData?.punctuality_rating || 3,
    overall_rating: editData?.overall_rating || 3,
    goals_met: editData?.goals_met || 'Yes',
    notes: editData?.notes || '',
  });

  const periodTypes = ['Weekly', 'Monthly', 'Quarterly', 'Annual'];
  const goalsMetOptions = ['Yes', 'Partial', 'No'];
  
  const ratingCategories = [
    { key: 'quality_rating', label: 'Quality of Work', icon: '🎯' },
    { key: 'productivity_rating', label: 'Productivity', icon: '⚡' },
    { key: 'teamwork_rating', label: 'Teamwork', icon: '🤝' },
    { key: 'communication_rating', label: 'Communication', icon: '💬' },
    { key: 'punctuality_rating', label: 'Punctuality', icon: '⏰' },
  ];

  const ratingDescriptions = {
    5: 'Excellent - Exceeds expectations',
    4: 'Good - Meets expectations well',
    3: 'Average - Meets basic expectations',
    2: 'Below Average - Needs improvement',
    1: 'Poor - Requires immediate attention',
  };

  useEffect(() => {
    // Auto-calculate overall rating when individual ratings change
    const overall = calculateOverallScore({
      quality: formData.quality_rating,
      productivity: formData.productivity_rating,
      teamwork: formData.teamwork_rating,
      communication: formData.communication_rating,
      punctuality: formData.punctuality_rating,
    });
    setFormData(prev => ({ ...prev, overall_rating: overall }));
  }, [
    formData.quality_rating,
    formData.productivity_rating,
    formData.teamwork_rating,
    formData.communication_rating,
    formData.punctuality_rating,
  ]);

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

  const handleRatingChange = (category, rating) => {
    setFormData(prev => ({
      ...prev,
      [category]: rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id) {
      showError('Please select an employee');
      return;
    }

    setLoading(true);

    try {
      const result = editData
        ? await updatePerformanceRecord(editData.id, formData)
        : await createPerformanceRecord(formData);

      if (result.success) {
        showSuccess(editData ? 'Performance record updated successfully' : 'Performance record created successfully');
        onSuccess();
      } else {
        showError(result.error || 'Failed to save performance record');
      }
    } catch (error) {
      showError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (category, currentRating) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingChange(category, rating)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    rating <= currentRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-lg font-semibold text-gray-700">
            {currentRating}/5
          </span>
        </div>
        <p className="text-sm text-gray-600 italic">
          {ratingDescriptions[currentRating]}
        </p>
      </div>
    );
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {editData ? 'Edit Performance Review' : 'New Performance Review'}
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
          {/* Employee and Date Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Review Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={handleEmployeeChange}
                  required
                  disabled={!!editData}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select employee...</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Type *
                </label>
                <select
                  name="period_type"
                  value={formData.period_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {periodTypes.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Rating Categories */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Performance Ratings</h3>
            <div className="space-y-6">
              {ratingCategories.map((category) => (
                <div key={category.key} className="border-b border-gray-200 pb-4 last:border-0">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <span className="mr-2">{category.icon}</span>
                    {category.label}
                  </label>
                  {renderStarRating(category.key, formData[category.key])}
                </div>
              ))}
            </div>
          </div>

          {/* Overall Rating Display */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Overall Rating (Auto-calculated)</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-10 h-10 ${
                      star <= formData.overall_rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formData.overall_rating}/5</p>
                <p className="text-sm text-gray-600">{ratingDescriptions[formData.overall_rating]}</p>
              </div>
            </div>
          </div>

          {/* Goals Met */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goals Met *
            </label>
            <div className="flex gap-4">
              {goalsMetOptions.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="goals_met"
                    value={option}
                    checked={formData.goals_met === option}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    option === 'Yes' ? 'bg-green-100 text-green-800' :
                    option === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes & Comments
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Add any additional comments or observations..."
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
              {loading ? 'Saving...' : editData ? 'Update Review' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}