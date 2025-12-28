import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
  Loader,
  Building,
} from 'lucide-react';
import {
  getOnboardingProfileByToken,
  updateOnboardingProfileByToken,
  uploadOnboardingDocument,
} from '../services/onboardingService';
import Loading from '../components/common/Loading';

export default function OnboardingFormPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    date_of_birth: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    marital_status: 'Single',
    bank_name: '',
    bank_account: '',
    payment_mode: 'Bank',
    work_history: [
      {
        company_name: '',
        job_title: '',
        start_date: '',
        end_date: '',
        referee_name: '',
        referee_email: '',
        referee_phone: '',
        referee_position: '',
        relationship: '',
      },
    ],
    references_consent: false,
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    passport: null,
    national_id: null,
    cv: null,
  });

  useEffect(() => {
    loadOnboardingProfile();
  }, [token]);

  const loadOnboardingProfile = async () => {
    setLoading(true);
    try {
      const result = await getOnboardingProfileByToken(token);
      if (result.success) {
        setProfile(result.data);
        
        // Pre-fill existing data if available
        if (result.data.date_of_birth) {
          setFormData((prev) => ({
            ...prev,
            date_of_birth: result.data.date_of_birth,
            address: result.data.address || '',
            emergency_contact_name: result.data.emergency_contact_name || '',
            emergency_contact_phone: result.data.emergency_contact_phone || '',
            marital_status: result.data.marital_status || 'Single',
            bank_name: result.data.bank_name || '',
            bank_account: result.data.bank_account || '',
            payment_mode: result.data.payment_mode || 'Bank',
          }));
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load onboarding form');
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

  const handleWorkHistoryChange = (index, field, value) => {
    const newWorkHistory = [...formData.work_history];
    newWorkHistory[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      work_history: newWorkHistory,
    }));
  };

  const addWorkHistory = () => {
    setFormData((prev) => ({
      ...prev,
      work_history: [
        ...prev.work_history,
        {
          company_name: '',
          job_title: '',
          start_date: '',
          end_date: '',
          referee_name: '',
          referee_email: '',
          referee_phone: '',
          referee_position: '',
          relationship: '',
        },
      ],
    }));
  };

  const removeWorkHistory = (index) => {
    if (formData.work_history.length > 1) {
      const newWorkHistory = formData.work_history.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        work_history: newWorkHistory,
      }));
    }
  };

  const handleFileChange = (documentType, e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFiles((prev) => ({
        ...prev,
        [documentType]: file,
      }));
    }
  };

  const uploadDocuments = async (profileId) => {
    const uploadPromises = [];

    for (const [type, file] of Object.entries(uploadedFiles)) {
      if (file) {
        uploadPromises.push(
          uploadOnboardingDocument(file, profileId, type)
        );
      }
    }

    await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.references_consent) {
      alert('Please consent to reference checks');
      return;
    }

    setSubmitting(true);
    try {
      // Update profile with form data
      const updateData = {
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        marital_status: formData.marital_status,
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
        payment_mode: formData.payment_mode,
        work_history: JSON.stringify(formData.work_history),
        references_consent: formData.references_consent,
        status: 'form_submitted',
      };

      const result = await updateOnboardingProfileByToken(token, updateData);

      if (result.success) {
        // Upload documents
        await uploadDocuments(result.data.id);

        alert('✅ Onboarding form submitted successfully! Our HR team will review your application.');
        navigate('/onboarding-success');
      } else {
        alert('Failed to submit form: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form');
    }
    setSubmitting(false);
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact HR for assistance.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to JulineMart!</h1>
            <p className="text-gray-600 mb-4">
              Complete your onboarding for: <strong>{profile.position}</strong>
            </p>
            
            {/* Progress Steps */}
            <div className="flex justify-center items-center gap-2 mt-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step === currentStep
                        ? 'bg-purple-600 text-white'
                        : step < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step < currentStep ? <CheckCircle className="w-6 h-6" /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-16 h-1 ${
                        step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-16 mt-2 text-xs text-gray-500">
              <span>Personal</span>
              <span>Work History</span>
              <span>Documents</span>
              <span>Review</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marital Status
                    </label>
                    <select
                      name="marital_status"
                      value={formData.marital_status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Home Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your full address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="bank_account"
                      value={formData.bank_account}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Work History */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Work History & References</h2>
                  <button
                    type="button"
                    onClick={addWorkHistory}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    + Add Job
                  </button>
                </div>

                {formData.work_history.map((job, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Previous Job #{index + 1}</h3>
                      {formData.work_history.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWorkHistory(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={job.company_name}
                          onChange={(e) => handleWorkHistoryChange(index, 'company_name', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={job.job_title}
                          onChange={(e) => handleWorkHistoryChange(index, 'job_title', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={job.start_date}
                          onChange={(e) => handleWorkHistoryChange(index, 'start_date', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={job.end_date}
                          onChange={(e) => handleWorkHistoryChange(index, 'end_date', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <h4 className="font-medium text-gray-700 mb-2">Reference Contact</h4>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Referee Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={job.referee_name}
                          onChange={(e) => handleWorkHistoryChange(index, 'referee_name', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Referee Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={job.referee_email}
                          onChange={(e) => handleWorkHistoryChange(index, 'referee_email', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Referee Phone
                        </label>
                        <input
                          type="tel"
                          value={job.referee_phone}
                          onChange={(e) => handleWorkHistoryChange(index, 'referee_phone', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Referee Position
                        </label>
                        <input
                          type="text"
                          value={job.referee_position}
                          onChange={(e) => handleWorkHistoryChange(index, 'referee_position', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., Manager, HR Officer"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Relationship
                        </label>
                        <input
                          type="text"
                          value={job.relationship}
                          onChange={(e) => handleWorkHistoryChange(index, 'relationship', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., Direct Manager, Colleague"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Documents</h2>

                <div className="space-y-4">
                  {[
                    { key: 'national_id', label: 'Voter\'s Card / National ID' },
                    { key: 'passport', label: 'Passport Photograph' },
                    { key: 'cv', label: 'CV' },
                  ].map((doc) => (
                    <div key={doc.key} className="p-4 border border-gray-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {doc.label} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(doc.key, e)}
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                          className="flex-1"
                        />
                        {uploadedFiles[doc.key] && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      {uploadedFiles[doc.key] && (
                        <p className="text-sm text-green-600 mt-1">
                          Selected: {uploadedFiles[doc.key].name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Accepted formats:</strong> PDF, JPG, PNG (Max 5MB per file)
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Review & Consent */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Submit</h2>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-600">Name:</span> {profile.full_name}</div>
                      <div><span className="text-gray-600">Email:</span> {profile.email}</div>
                      <div><span className="text-gray-600">Phone:</span> {profile.phone}</div>
                      <div><span className="text-gray-600">DOB:</span> {formData.date_of_birth}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Employment</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-600">Position:</span> {profile.position}</div>
                      <div><span className="text-gray-600">Department:</span> {profile.department}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Work History</h3>
                    <p className="text-sm text-gray-600">{formData.work_history.length} previous employer(s) provided</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
                    <p className="text-sm text-gray-600">
                      {Object.values(uploadedFiles).filter(Boolean).length} document(s) ready to upload
                    </p>
                  </div>
                </div>

                {/* Consent */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="references_consent"
                      checked={formData.references_consent}
                      onChange={handleChange}
                      required
                      className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">
                      I consent to JulineMart contacting my referees for employment verification. 
                      I confirm that all information provided is accurate to the best of my knowledge.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8 pt-6 border-t">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Previous
                </button>
              )}
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || !formData.references_consent}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Submit Onboarding Form
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
