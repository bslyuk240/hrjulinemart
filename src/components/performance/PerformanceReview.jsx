import React from 'react';
import { X, Star, Calendar, Award, Target, MessageSquare } from 'lucide-react';
import { getRatingLabel, getRatingColor } from '../../services/performanceService';

export default function PerformanceReview({ record, onClose }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const ratingCategories = [
    { key: 'quality_rating', label: 'Quality of Work', icon: '🎯', color: 'blue' },
    { key: 'productivity_rating', label: 'Productivity', icon: '⚡', color: 'green' },
    { key: 'teamwork_rating', label: 'Teamwork', icon: '🤝', color: 'purple' },
    { key: 'communication_rating', label: 'Communication', icon: '💬', color: 'orange' },
    { key: 'punctuality_rating', label: 'Punctuality', icon: '⏰', color: 'pink' },
  ];

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
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Performance Review</h2>
              <p className="text-blue-100 mt-1">{record.employee_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Review Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">Review Date</p>
              </div>
              <p className="text-gray-900 font-semibold">{formatDate(record.date)}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-medium text-gray-700">Period Type</p>
              </div>
              <p className="text-gray-900 font-semibold">{record.period_type}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-gray-700">Goals Met</p>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                record.goals_met === 'Yes' 
                  ? 'bg-green-100 text-green-800' 
                  : record.goals_met === 'Partial'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {record.goals_met}
              </span>
            </div>
          </div>

          {/* Overall Rating Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Performance Rating</h3>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                {renderStars(record.overall_rating)}
                <p className="text-3xl font-bold text-gray-900 mt-2">{record.overall_rating}/5</p>
                <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mt-2 ${getRatingColor(record.overall_rating)}`}>
                  {getRatingLabel(record.overall_rating)}
                </span>
              </div>
            </div>
          </div>

          {/* Individual Ratings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
            <div className="space-y-6">
              {ratingCategories.map((category) => (
                <div key={category.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{category.label}</p>
                      <p className="text-sm text-gray-600">{getRatingLabel(record[category.key])}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderStars(record[category.key])}
                    <span className="text-xl font-bold text-gray-900 min-w-[40px]">
                      {record[category.key]}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {ratingCategories.map((category) => {
                const percentage = (record[category.key] / 5) * 100;
                const colorClasses = {
                  blue: 'bg-blue-500',
                  green: 'bg-green-500',
                  purple: 'bg-purple-500',
                  orange: 'bg-orange-500',
                  pink: 'bg-pink-500',
                };
                
                return (
                  <div key={category.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{category.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{record[category.key]}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${colorClasses[category.color]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Section */}
          {record.notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Notes & Comments</h3>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(record.created_at).toLocaleString('en-GB')}
              </div>
              {record.updated_at && record.updated_at !== record.created_at && (
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {new Date(record.updated_at).toLocaleString('en-GB')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}