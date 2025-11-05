import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  getAllPerformanceRecords,
  deletePerformanceRecord,
  getPerformanceStats,
  getRatingLabel,
  getRatingColor
} from '../../services/performanceService';
import { 
  Plus, 
  Search, 
  Filter,
  Star,
  TrendingUp,
  Users,
  Award,
  Trash2,
  Eye,
  Edit,
  BarChart3
} from 'lucide-react';
import PerformanceForm from './PerformanceForm';
import PerformanceReview from './PerformanceReview';
import { useAuth } from '../../context/AuthContext';
import Loading from '../common/Loading';
import Modal from '../common/Modal';

export default function PerformanceList({ employees }) {
  const { showSuccess, showError } = useApp();
  const { isAdmin, isManager } = useAuth();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    averageOverall: 0,
    excellent: 0,
    good: 0,
    average: 0,
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  const periodTypes = ['Weekly', 'Monthly', 'Quarterly', 'Annual'];
  const ratingOptions = [1, 2, 3, 4, 5];

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, filterPeriod, filterRating, records]);

  const fetchRecords = async () => {
    setLoading(true);
    const result = await getAllPerformanceRecords();
    
    if (result.success) {
      setRecords(result.data);
      setFilteredRecords(result.data);
    } else {
      showError(result.error || 'Failed to fetch performance records');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getPerformanceStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPeriod) {
      filtered = filtered.filter(record => record.period_type === filterPeriod);
    }

    if (filterRating) {
      filtered = filtered.filter(record => record.overall_rating === parseInt(filterRating));
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async () => {
    const result = await deletePerformanceRecord(deleteModal.id);
    
    if (result.success) {
      showSuccess('Performance record deleted successfully');
      fetchRecords();
      fetchStats();
    } else {
      showError(result.error || 'Failed to delete performance record');
    }
    
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setShowForm(true);
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowReview(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPeriod('');
    setFilterRating('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Management</h1>
          <p className="text-gray-600 mt-1">Track and manage employee performance reviews</p>
        </div>
        <button
          onClick={() => {
            setSelectedRecord(null);
            setShowForm(true);
          }}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Review
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Reviews</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Average Rating</p>
              <p className="text-3xl font-bold mt-2">{stats.averageOverall}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Star className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Excellent (5★)</p>
              <p className="text-3xl font-bold mt-2">{stats.excellent}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Award className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Good (4★)</p>
              <p className="text-3xl font-bold mt-2">{stats.good}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Period Filter */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Periods</option>
            {periodTypes.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Ratings</option>
            {ratingOptions.map((rating) => (
              <option key={rating} value={rating}>
                {rating} Star{rating !== 1 ? 's' : ''}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Mobile List (cards) */}
      <div className="md:hidden space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">No performance records found</div>
        ) : (
          filteredRecords.map((rec) => (
            <div key={rec.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{rec.employee_name}</p>
                  <p className="text-sm text-gray-500">{new Date(rec.date).toLocaleDateString('en-GB')}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRatingColor(rec.overall_rating)}`}>
                  {getRatingLabel(rec.overall_rating)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-gray-500">Period</p>
                  <p className="font-medium">{rec.period_type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Goals</p>
                  <p className="font-medium">{rec.goals_met}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => handleView(rec)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
                {(isAdmin() || isManager()) && (
                  <button
                    onClick={() => handleEdit(rec)}
                    className="px-3 py-1.5 text-sm border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
                  >
                    Edit
                  </button>
                )}
                {(isAdmin() || isManager()) && (
                  <button
                    onClick={() => setDeleteModal({ show: true, id: rec.id, name: rec.employee_name })}
                    className="px-3 py-1.5 text-sm border border-red-600 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Period</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Overall Rating</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Goals Met</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <BarChart3 className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No performance records found</p>
                      <p className="text-sm mt-2">Create a new review to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{record.employee_name}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {record.period_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        {renderStars(record.overall_rating)}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRatingColor(record.overall_rating)}`}>
                          {getRatingLabel(record.overall_rating)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        record.goals_met === 'Yes' 
                          ? 'bg-green-100 text-green-800' 
                          : record.goals_met === 'Partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.goals_met}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleView(record)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ 
                            show: true, 
                            id: record.id, 
                            name: record.employee_name 
                          })}
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

        {/* Results Count */}
        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredRecords.length}</span> of{' '}
              <span className="font-medium">{records.length}</span> records
            </p>
          </div>
        )}
      </div>

      {/* Performance Form Modal */}
      {showForm && (
        <PerformanceForm
          employees={employees}
          editData={selectedRecord}
          onClose={() => {
            setShowForm(false);
            setSelectedRecord(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedRecord(null);
            fetchRecords();
            fetchStats();
          }}
        />
      )}

      {/* Performance Review Modal */}
      {showReview && selectedRecord && (
        <PerformanceReview
          record={selectedRecord}
          onClose={() => {
            setShowReview(false);
            setSelectedRecord(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <Modal
          title="Delete Performance Record"
          onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <p className="text-gray-700">
            Are you sure you want to delete the performance record for{' '}
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
