import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Building,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  Loader,
  Download,
  Eye,
} from 'lucide-react';
import {
  getOnboardingDocuments,
  approveOnboarding,
  rejectOnboarding,
  updateOnboardingStatus,
} from '../../services/onboardingService';
import {
  getReferenceRequestsByProfile,
  getReferencesByProfile,
  createReferenceRequest,
} from '../../services/referenceService';
import { sendOnboardingApprovedEmail, sendReferenceRequestEmail } from '../../services/emailService';

export default function OnboardingDetailsModal({ profile, onClose }) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [referenceRequests, setReferenceRequests] = useState([]);
  const [references, setReferences] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [profile.id]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Fetch documents
      const docsResult = await getOnboardingDocuments(profile.id);
      if (docsResult.success) {
        setDocuments(docsResult.data);
      }

      // Fetch reference requests
      const reqResult = await getReferenceRequestsByProfile(profile.id);
      if (reqResult.success) {
        setReferenceRequests(reqResult.data);
      }

      // Fetch submitted references
      const refResult = await getReferencesByProfile(profile.id);
      if (refResult.success) {
        setReferences(refResult.data);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!confirm('Approve this onboarding and create employee record?')) return;

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const result = await approveOnboarding(profile.id, user?.username || 'admin');

      if (result.success) {
        alert(`✅ Onboarding approved! Employee created with code: ${result.data.employee.employee_code}`);
        onClose();
      } else {
        alert('Failed to approve onboarding: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving onboarding:', error);
      alert('Error approving onboarding');
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const result = await rejectOnboarding(profile.id, rejectionReason, user?.username || 'admin');

      if (result.success) {
        alert('Onboarding rejected successfully');
        onClose();
      } else {
        alert('Failed to reject onboarding: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting onboarding:', error);
      alert('Error rejecting onboarding');
    }
    setLoading(false);
  };

  const handleSendReferenceRequests = async () => {
    if (!profile.work_history || profile.work_history.length === 0) {
      alert('No work history available to send reference requests');
      return;
    }

    if (!confirm('Send reference request emails to all referees?')) return;

    setLoading(true);
    try {
      const workHistory = JSON.parse(profile.work_history);
      
      for (const job of workHistory) {
        if (job.referee_email) {
          // Create reference request
          const reqResult = await createReferenceRequest({
            onboarding_profile_id: profile.id,
            referee_name: job.referee_name,
            referee_email: job.referee_email,
            referee_phone: job.referee_phone,
            company_name: job.company_name,
            referee_position: job.referee_position,
            relationship: job.relationship,
          });

          if (reqResult.success) {
            // Send email
            await sendReferenceRequestEmail(
              job.referee_email,
              job.referee_name,
              profile.full_name,
              profile.position,
              reqResult.data.request_token
            );
          }
        }
      }

      // Update status
      await updateOnboardingStatus(profile.id, 'awaiting_references');
      
      alert('Reference requests sent successfully!');
      fetchProfileData();
    } catch (error) {
      console.error('Error sending reference requests:', error);
      alert('Error sending reference requests');
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600',
      sent: 'text-blue-600',
      opened: 'text-purple-600',
      completed: 'text-green-600',
      expired: 'text-red-600',
      cancelled: 'text-gray-600',
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{profile.full_name}</h2>
            <p className="text-sm opacity-90">{profile.position} - {profile.department}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            {['details', 'documents', 'references'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 border-b-2 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium">{profile.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{profile.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Date of Birth</p>
                      <p className="font-medium">{formatDate(profile.date_of_birth)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="font-medium">{profile.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium">{profile.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Proposed Salary</p>
                      <p className="font-medium">{formatCurrency(profile.proposed_salary)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="font-medium">{formatDate(profile.proposed_start_date)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking Info */}
              {profile.bank_name && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Bank Name</p>
                      <p className="font-medium">{profile.bank_name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Account Number</p>
                      <p className="font-medium">{profile.bank_account}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
              {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <FileText className="w-8 h-8 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.document_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{doc.document_type.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {(doc.file_size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'references' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Reference Checks</h3>
                {profile.status === 'form_submitted' && referenceRequests.length === 0 && (
                  <button
                    onClick={handleSendReferenceRequests}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Send Reference Requests
                  </button>
                )}
              </div>

              {/* Reference Requests */}
              {referenceRequests.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Reference Requests</h4>
                  <div className="space-y-3">
                    {referenceRequests.map((req) => (
                      <div key={req.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{req.referee_name}</p>
                            <p className="text-sm text-gray-600">{req.company_name}</p>
                            <p className="text-xs text-gray-500">{req.referee_email}</p>
                          </div>
                          <span className={`text-sm font-medium capitalize ${getStatusColor(req.status)}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted References */}
              {references.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Submitted References</h4>
                  <div className="space-y-4">
                    {references.map((ref) => (
                      <div key={ref.id} className="p-4 border border-gray-200 rounded-lg bg-green-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{ref.referee_name}</p>
                            <p className="text-sm text-gray-600">{ref.company_name} - {ref.referee_position}</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Performance</p>
                            <p className="font-medium">{ref.overall_performance_rating}/5</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Would Rehire</p>
                            <p className="font-medium">{ref.would_rehire ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {referenceRequests.length === 0 && references.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No reference requests sent yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex gap-3 justify-end">
            {profile.status === 'references_received' && !showRejectDialog && (
              <>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve & Create Employee
                </button>
              </>
            )}

            {showRejectDialog && (
              <div className="flex-1 flex gap-3">
                <input
                  type="text"
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
