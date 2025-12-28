import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  Mail,
  Building,
  CheckCircle,
  AlertCircle,
  Loader,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import {
  getReferenceRequestByToken,
  submitReference,
  markReferenceAsOpened,
} from '../services/referenceService';
import { getOnboardingProfileById } from '../services/onboardingService';
import Loading from '../components/common/Loading';

export default function ReferenceFormPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    referee_name: '',
    referee_position: '',
    company_name: '',
    referee_email: '',
    referee_phone: '',
    employment_confirmed: true,
    employment_start_date: '',
    employment_end_date: '',
    job_title: '',
    overall_performance_rating: 3,
    reliability_rating: 3,
    teamwork_rating: 3,
    communication_rating: 3,
    conduct_issues: false,
    conduct_details: '',
    would_rehire: true,
    rehire_comments: '',
    strengths: '',
    areas_for_improvement: '',
    additional_comments: '',
    declaration_accepted: false,
    digital_signature: '',
  });

  useEffect(() => {
    loadReferenceRequest();
  }, [token]);

  const loadReferenceRequest = async () => {
    setLoading(true);
    try {
      const result = await getReferenceRequestByToken(token);
      if (result.success) {
        setRequest(result.data);
        
        // Mark as opened
        await markReferenceAsOpened(token);
        
        // Load candidate info
        const candidateResult = await getOnboardingProfileById(result.data.onboarding_profile_id);
        if (candidateResult.success) {
          setCandidate(candidateResult.data);
        }
        
        // Pre-fill referee info
        setFormData((prev) => ({
          ...prev,
          referee_name: result.data.referee_name || '',
          referee_email: result.data.referee_email || '',
          referee_phone: result.data.referee_phone || '',
          company_name: result.data.company_name || '',
          referee_position: result.data.referee_position || '',
        }));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load reference request');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRatingChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: parseInt(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.declaration_accepted) {
      alert('Please accept the declaration to submit');
      return;
    }

    if (!formData.digital_signature.trim()) {
      alert('Please provide your digital signature');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitReference({
        reference_request_id: request.id,
        onboarding_profile_id: request.onboarding_profile_id,
        ...formData,
        ip_address: 'N/A', // Could be captured via API
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        alert('Failed to submit reference: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting reference:', error);
      alert('Error submitting reference');
    }
    setSubmitting(false);
  };

  const renderStarRating = (field, label) => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(field, star)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= formData[field]
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {formData[field]}/5
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">If you believe this is an error, please contact the requesting organization.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="text-center max-w-md bg-white rounded-lg shadow-xl p-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-4">
            Your reference for <strong>{candidate?.full_name}</strong> has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            Your feedback is valuable and will be treated with strict confidentiality.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  if (!request || !candidate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Employment Reference Request</h1>
            <p className="text-gray-600 mb-4">
              <strong>{candidate.full_name}</strong> has applied for the position of <strong>{candidate.position}</strong> with JulineMart
            </p>
            <div className="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
              All responses are confidential
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-8">
          {/* Referee Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="referee_name"
                  value={formData.referee_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Position <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="referee_position"
                  value={formData.referee_position}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="referee_email"
                  value={formData.referee_email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Phone
                </label>
                <input
                  type="tel"
                  name="referee_phone"
                  value={formData.referee_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Employment Verification */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Employment Verification</h2>
            
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="employment_confirmed"
                  checked={formData.employment_confirmed}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  I confirm that {candidate.full_name} was employed at our organization
                </span>
              </label>
            </div>

            {formData.employment_confirmed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Start Date
                  </label>
                  <input
                    type="date"
                    name="employment_start_date"
                    value={formData.employment_start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment End Date
                  </label>
                  <input
                    type="date"
                    name="employment_end_date"
                    value={formData.employment_end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Performance Ratings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Assessment</h2>
            <p className="text-sm text-gray-600 mb-4">Please rate the candidate on a scale of 1-5 (1 = Poor, 5 = Excellent)</p>
            
            <div className="space-y-6">
              {renderStarRating('overall_performance_rating', 'Overall Performance')}
              {renderStarRating('reliability_rating', 'Reliability & Dependability')}
              {renderStarRating('teamwork_rating', 'Teamwork & Collaboration')}
              {renderStarRating('communication_rating', 'Communication Skills')}
            </div>
          </div>

          {/* Conduct */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Conduct & Behavior</h2>
            
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="conduct_issues"
                  checked={formData.conduct_issues}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  There were conduct or disciplinary issues during employment
                </span>
              </label>
            </div>

            {formData.conduct_issues && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please provide details
                </label>
                <textarea
                  name="conduct_details"
                  value={formData.conduct_details}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {/* Re-employment */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Re-employment Consideration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Would you consider re-employing this candidate?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="would_rehire"
                      value="true"
                      checked={formData.would_rehire === true}
                      onChange={(e) => setFormData((prev) => ({ ...prev, would_rehire: true }))}
                      className="w-5 h-5 text-green-600"
                    />
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="would_rehire"
                      value="false"
                      checked={formData.would_rehire === false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, would_rehire: false }))}
                      className="w-5 h-5 text-red-600"
                    />
                    <ThumbsDown className="w-5 h-5 text-red-600" />
                    <span className="font-medium">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments (Optional)
                </label>
                <textarea
                  name="rehire_comments"
                  value={formData.rehire_comments}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Comments */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Feedback</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Strengths
                </label>
                <textarea
                  name="strengths"
                  value={formData.strengths}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="What are this candidate's main strengths?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas for Improvement
                </label>
                <textarea
                  name="areas_for_improvement"
                  value={formData.areas_for_improvement}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Any areas where the candidate could improve?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Comments
                </label>
                <textarea
                  name="additional_comments"
                  value={formData.additional_comments}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Any other information that would be helpful?"
                />
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="declaration_accepted"
                  checked={formData.declaration_accepted}
                  onChange={handleChange}
                  required
                  className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  I declare that the information provided above is accurate and complete to the best of my knowledge. 
                  I understand that this reference may be used for employment verification purposes.
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digital Signature (Type your full name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="digital_signature"
                value={formData.digital_signature}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Type your full name as signature"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !formData.declaration_accepted || !formData.digital_signature}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Submitting Reference...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Submit Reference
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            This reference will be treated with strict confidentiality
          </p>
        </form>
      </div>
    </div>
  );
}