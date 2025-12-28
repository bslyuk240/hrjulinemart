import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  FileText,
  TrendingUp,
  AlertCircle,
  Send,
  Eye,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAllOnboardingProfiles,
  getOnboardingStatistics,
  updateOnboardingStatus,
  deleteOnboardingProfile,
} from '../services/onboardingService';
import { sendOnboardingEmail } from '../services/emailService';
import CreateOnboardingModal from '../components/onboarding/CreateOnboardingModal';
import OnboardingDetailsModal from '../components/onboarding/OnboardingDetailsModal';
import Loading from '../components/common/Loading';

export default function OnboardingDashboard() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [onboardingProfiles, setOnboardingProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    fetchOnboardingData();
  }, [isAdmin]);

  useEffect(() => {
    filterProfiles();
  }, [searchTerm, statusFilter, onboardingProfiles]);

  const fetchOnboardingData = async () => {
    setLoading(true);
    try {
      // Fetch all onboarding profiles
      const profilesResult = await getAllOnboardingProfiles();
      if (profilesResult.success) {
        setOnboardingProfiles(profilesResult.data);
      }

      // Fetch statistics
      const statsResult = await getOnboardingStatistics();
      if (statsResult.success) {
        setStatistics(statsResult.data);
      }
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    }
    setLoading(false);
  };

  const filterProfiles = () => {
    let filtered = [...onboardingProfiles];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (profile) =>
          profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((profile) => profile.status === statusFilter);
    }

    setFilteredProfiles(filtered);
  };

  const handleSendOnboardingLink = async (profile) => {
    if (!confirm(`Send onboarding link to ${profile.full_name}?`)) return;

    try {
      const result = await sendOnboardingEmail(
        profile.email,
        profile.full_name,
        profile.position,
        profile.onboarding_token
      );

      if (result.success) {
        // Update status to 'link_sent'
        await updateOnboardingStatus(profile.id, 'link_sent');
        alert('Onboarding link sent successfully!');
        fetchOnboardingData();
      } else {
        alert('Failed to send email: ' + result.error);
      }
    } catch (error) {
      console.error('Error sending onboarding link:', error);
      alert('Error sending onboarding link');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Are you sure you want to delete this onboarding profile?')) return;

    try {
      const result = await deleteOnboardingProfile(profileId);
      if (result.success) {
        alert('Onboarding profile deleted successfully');
        fetchOnboardingData();
      } else {
        alert('Failed to delete profile: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Error deleting profile');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      link_sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Link Sent' },
      form_submitted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Form Submitted' },
      awaiting_references: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Awaiting References' },
      references_received: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'References Received' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      completed: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Completed' },
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Employee Onboarding</h1>
        <p className="text-sm md:text-base text-gray-600">Manage pre-employment onboarding and reference checks</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Onboarding</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <Users className="w-8 h-8 md:w-12 md:h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Pending</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">
                  {statistics.draft + statistics.link_sent + statistics.form_submitted}
                </p>
              </div>
              <Clock className="w-8 h-8 md:w-12 md:h-12 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Awaiting References</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{statistics.awaiting_references}</p>
              </div>
              <FileText className="w-8 h-8 md:w-12 md:h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Approved</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{statistics.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 md:w-12 md:h-12 text-green-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full text-sm md:text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter and Create Button */}
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-sm md:text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="link_sent">Link Sent</option>
                <option value="form_submitted">Form Submitted</option>
                <option value="awaiting_references">Awaiting References</option>
                <option value="references_received">References Received</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md whitespace-nowrap text-sm md:text-base"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">New Onboarding</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding Profiles Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <tr>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold">Candidate</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold">Position</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-semibold">Status</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-semibold">Created</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-semibold">Start Date</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 md:px-6 py-8 md:py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle className="w-12 h-12 md:w-16 md:h-16 mb-4" />
                      <p className="text-base md:text-lg font-medium">No onboarding profiles found</p>
                      <p className="text-xs md:text-sm mt-2">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click "New Onboarding" to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div>
                        <p className="font-medium text-gray-900 text-xs md:text-base">{profile.full_name}</p>
                        <p className="text-xs md:text-sm text-gray-500 truncate max-w-[150px] md:max-w-none">{profile.email}</p>
                        <p className="text-xs text-gray-400">{profile.phone}</p>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div>
                        <p className="font-medium text-gray-900 text-xs md:text-base">{profile.position}</p>
                        <p className="text-xs md:text-sm text-gray-500">{profile.department}</p>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center">{getStatusBadge(profile.status)}</td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm text-gray-600">
                      {formatDate(profile.created_at)}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm text-gray-600">
                      {formatDate(profile.proposed_start_date)}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedProfile(profile);
                            setShowDetailsModal(true);
                          }}
                          className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 md:w-5 md:h-5" />
                        </button>

                        {/* Send Link (only for draft status) */}
                        {profile.status === 'draft' && (
                          <button
                            onClick={() => handleSendOnboardingLink(profile)}
                            className="p-1.5 md:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Send Onboarding Link"
                          >
                            <Send className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(profile.status === 'draft' || profile.status === 'rejected') && (
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="md:hidden">
          {filteredProfiles.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p className="text-base font-medium">No onboarding profiles found</p>
                <p className="text-xs mt-2">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Click "New Onboarding" to get started'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProfiles.map((profile) => (
                <div key={profile.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{profile.full_name}</p>
                      <p className="text-xs text-gray-500">{profile.email}</p>
                      <p className="text-xs text-gray-400">{profile.phone}</p>
                    </div>
                    {getStatusBadge(profile.status)}
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <span className="text-gray-500">Position:</span> {profile.position}
                    </p>
                    <p>
                      <span className="text-gray-500">Department:</span> {profile.department}
                    </p>
                    <p>
                      <span className="text-gray-500">Created:</span> {formatDate(profile.created_at)}
                    </p>
                    <p>
                      <span className="text-gray-500">Start Date:</span> {formatDate(profile.proposed_start_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedProfile(profile);
                        setShowDetailsModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>

                    {profile.status === 'draft' && (
                      <button
                        onClick={() => handleSendOnboardingLink(profile)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send Onboarding Link"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    )}

                    {(profile.status === 'draft' || profile.status === 'rejected') && (
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateOnboardingModal
          onClose={() => {
            setShowCreateModal(false);
            fetchOnboardingData();
          }}
        />
      )}

      {showDetailsModal && selectedProfile && (
        <OnboardingDetailsModal
          profile={selectedProfile}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProfile(null);
            fetchOnboardingData();
          }}
        />
      )}
    </div>
  );
}
