import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building,
  Calendar,
  DollarSign,
  CreditCard,
  Lock,
  Save,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  Clock,
  Award,
  MapPin,
  Heart
} from 'lucide-react';
import Loading from '../components/common/Loading';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile Data State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    profile_pic: '',
    employee_code: '',
    position: '',
    department: '',
    join_date: '',
    salary: '',
    leave_balance: 0,
    is_manager: false,
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    date_of_birth: '',
    marital_status: '',
  });

  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    bank_account: '',
    payment_mode: 'Bank',
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Stats State
  const [stats, setStats] = useState({
    totalLeave: 0,
    attendanceThisMonth: 0,
    performanceRating: null,
  });

  useEffect(() => {
    fetchProfileData();
    fetchStats();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        profile_pic: data.profile_pic || '',
        employee_code: data.employee_code || '',
        position: data.position || '',
        department: data.department || '',
        join_date: data.join_date || '',
        salary: data.salary || '',
        leave_balance: data.leave_balance || 0,
        is_manager: data.is_manager || false,
        address: data.address || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        date_of_birth: data.date_of_birth || '',
        marital_status: data.marital_status || '',
      });

      setBankDetails({
        bank_name: data.bank_name || '',
        bank_account: data.bank_account || '',
        payment_mode: data.payment_mode || 'Bank',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
  if (!user?.id) return;

  try {
    // Get total approved leave
    const { data: leaveData, count: leaveCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact' })
      .eq('employee_id', user.id)
      .eq('status', 'approved');

    // Get attendance this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const { data: attendanceData, count: attendanceCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('employee_id', user.id)
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    // Get latest performance review - FIXED
    const { data: performanceData, error: perfError } = await supabase
      .from('performance_records')
      .select('overall_rating')  // ✅ Changed from 'rating' to 'overall_rating'
      .eq('employee_id', user.id)
      .order('date', { ascending: false })  // ✅ Changed from 'created_at' to 'date'
      .limit(1);

    console.log('Performance data:', performanceData); // Keep for debugging
    console.log('Performance error:', perfError); // Keep for debugging

    // Check if we got data
    const latestRating = performanceData && performanceData.length > 0 
      ? performanceData[0].overall_rating  // ✅ Changed from .rating to .overall_rating
      : null;

    console.log('Latest rating:', latestRating); // Keep for debugging

    setStats({
      totalLeave: leaveCount || 0,
      attendanceThisMonth: attendanceCount || 0,
      performanceRating: latestRating,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

  const handlePersonalUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          profile_pic: profileData.profile_pic,
          address: profileData.address,
          emergency_contact_name: profileData.emergency_contact_name,
          emergency_contact_phone: profileData.emergency_contact_phone,
          date_of_birth: profileData.date_of_birth,
          marital_status: profileData.marital_status,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update context
      updateUser({
        name: profileData.name,
        phone: profileData.phone,
        profile_pic: profileData.profile_pic,
      });

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
    setSaving(false);
  };

  const handleBankUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          bank_name: bankDetails.bank_name,
          bank_account: bankDetails.bank_account,
          payment_mode: bankDetails.payment_mode,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Bank details updated successfully!');
    } catch (error) {
      console.error('Error updating bank details:', error);
      alert('Failed to update bank details');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);

    try {
      // Verify current password
      const { data: employee } = await supabase
        .from('employees')
        .select('password')
        .eq('id', user.id)
        .single();

      if (employee.password !== passwordData.currentPassword) {
        alert('Current password is incorrect');
        setSaving(false);
        return;
      }

      // Update to new password
      const { error } = await supabase
        .from('employees')
        .update({ password: passwordData.newPassword })
        .eq('id', user.id);

      if (error) throw error;

      alert('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    }
    setSaving(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Profile Picture */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white shadow-lg mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-white bg-opacity-20 flex items-center justify-center shadow-xl border-4 border-white">
              {profileData.profile_pic ? (
                <img
                  src={profileData.profile_pic}
                  alt={profileData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-white" />
              )}
            </div>
            {profileData.is_manager && (
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-lg">
                <Shield className="w-5 h-5 text-yellow-900" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profileData.name}</h1>
            <p className="text-purple-100 text-lg mb-1">{profileData.position}</p>
            <p className="text-purple-200 text-sm">{profileData.department}</p>
            {profileData.is_manager && (
              <div className="inline-flex items-center px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-semibold mt-3">
                <Shield className="w-4 h-4 mr-1" />
                Manager
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{profileData.leave_balance}</p>
              <p className="text-xs text-purple-100">Leave Balance</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <Clock className="w-6 h-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.attendanceThisMonth}</p>
              <p className="text-xs text-purple-100">Days Present</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <Award className="w-6 h-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.performanceRating || 'N/A'}</p>
              <p className="text-xs text-purple-100">Performance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-4 space-y-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'personal'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Personal Info</span>
            </button>

            <button
              onClick={() => setActiveTab('employment')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'employment'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="font-medium">Employment</span>
            </button>

            <button
              onClick={() => setActiveTab('bank')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'bank'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Bank Details</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'security'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span className="font-medium">Security</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
                <form onSubmit={handlePersonalUpdate} className="space-y-6">
                  {/* Profile Picture */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Picture URL
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        {profileData.profile_pic ? (
                          <img
                            src={profileData.profile_pic}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="url"
                          value={profileData.profile_pic}
                          onChange={(e) => setProfileData({ ...profileData, profile_pic: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="https://your-image-url.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">Paste your image URL</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* Employee Code (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Shield className="w-4 h-4 inline mr-1" />
                        Employee Code
                      </label>
                      <input
                        type="text"
                        value={profileData.employee_code}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profileData.date_of_birth}
                        onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* Marital Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Heart className="w-4 h-4 inline mr-1" />
                        Marital Status
                      </label>
                      <select
                        value={profileData.marital_status}
                        onChange={(e) => setProfileData({ ...profileData, marital_status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                  </div>

                  {/* Address - Full width */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Address
                    </label>
                    <textarea
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your full address"
                    />
                  </div>

                  {/* Emergency Contact Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Emergency Contact Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={profileData.emergency_contact_name}
                          onChange={(e) => setProfileData({ ...profileData, emergency_contact_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="e.g., John Doe"
                        />
                      </div>

                      {/* Emergency Contact Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={profileData.emergency_contact_phone}
                          onChange={(e) => setProfileData({ ...profileData, emergency_contact_phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="e.g., +234 XXX XXX XXXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Employment Information Tab */}
            {activeTab === 'employment' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Employment Information</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Briefcase className="w-4 h-4 mr-2" />
                        Position
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{profileData.position || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Building className="w-4 h-4 mr-2" />
                        Department
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{profileData.department || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        Join Date
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(profileData.join_date)}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Monthly Salary
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(profileData.salary)}</p>
                    </div>

                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        Leave Balance
                      </label>
                      <p className="text-2xl font-bold text-green-600">{profileData.leave_balance} days</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Shield className="w-4 h-4 mr-2" />
                        Role
                      </label>
                      <p className="text-lg font-semibold text-blue-600">
                        {profileData.is_manager ? 'Manager' : 'Employee'}
                      </p>
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">{stats.totalLeave}</p>
                        <p className="text-sm text-gray-600 mt-1">Total Leave Taken</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.attendanceThisMonth}</p>
                        <p className="text-sm text-gray-600 mt-1">Days Present (This Month)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.performanceRating || 'N/A'}</p>
                        <p className="text-sm text-gray-600 mt-1">Performance Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Bank Details</h2>
                <form onSubmit={handleBankUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bank Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankDetails.bank_name}
                        onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., Zenith Bank"
                      />
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankDetails.bank_account}
                        onChange={(e) => setBankDetails({ ...bankDetails, bank_account: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 1234567890"
                      />
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <select
                        value={bankDetails.payment_mode}
                        onChange={(e) => setBankDetails({ ...bankDetails, payment_mode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="Bank">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Lock className="w-5 h-5 mr-2" />
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}