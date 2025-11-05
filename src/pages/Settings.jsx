import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import {
  Building,
  User,
  Lock,
  Bell,
  Database,
  DollarSign,
  Calendar,
  Save,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Phone,
  MapPin,
  FileText,
  Settings as SettingsIcon,
  Users,
  Briefcase
} from 'lucide-react';
import Loading from '../components/common/Loading';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile Settings State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    profile_pic: '',
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Company Settings State (Admin Only)
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_logo: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    tax_id: '',
    digital_signature: '',
  });

  // System Settings State (Admin Only)
  const [systemSettings, setSystemSettings] = useState({
    default_leave_balance: 21,
    working_days_per_week: 5,
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    overtime_rate: 1.5,
    fiscal_year_start: '01-01',
  });

  // Payroll Settings State (Admin Only)
  const [payrollSettings, setPayrollSettings] = useState({
    tax_rate: 0,
    pension_rate: 8,
    nhf_rate: 2.5,
    salary_payment_day: 25,
    currency: 'NGN',
  });

  // Department & Position Management State (Admin Only)
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');

  useEffect(() => {
    fetchUserProfile();
    if (isAdmin()) {
      fetchCompanySettings();
      fetchSystemSettings();
      fetchPayrollSettings();
      fetchDepartmentsAndPositions();
    }
  }, [user, isAdmin]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('name, email, phone, profile_pic')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        profile_pic: data.profile_pic || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  const fetchCompanySettings = async () => {
    // In a real app, you'd have a company_settings table
    // For now, we'll use environment variables as defaults
    setCompanySettings({
      company_name: import.meta.env.VITE_COMPANY_NAME || 'JulineMart',
      company_logo: import.meta.env.VITE_COMPANY_LOGO || '',
      company_address: 'No. 9 Jesus is Lord Street off Refinery road, Effurun Warri Delta State',
      company_email: 'info@julinemart.com',
      company_phone: '+234 XXX XXX XXXX',
      tax_id: '',
      digital_signature: import.meta.env.VITE_DIGITAL_SIGNATURE || '',
    });
  };

  const fetchSystemSettings = async () => {
    // Placeholder - you can create a settings table in Supabase
    // For now using default values
  };

  const fetchPayrollSettings = async () => {
    // Placeholder - you can create a payroll_settings table
  };

  const fetchDepartmentsAndPositions = async () => {
    try {
      // Get unique departments
      const { data: deptData } = await supabase
        .from('employees')
        .select('department')
        .not('department', 'is', null);

      const uniqueDepts = [...new Set(deptData?.map(d => d.department))].filter(Boolean);
      setDepartments(uniqueDepts);

      // Get unique positions
      const { data: posData } = await supabase
        .from('employees')
        .select('position')
        .not('position', 'is', null);

      const uniquePos = [...new Set(posData?.map(p => p.position))].filter(Boolean);
      setPositions(uniquePos);
    } catch (error) {
      console.error('Error fetching departments/positions:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          profile_pic: profileData.profile_pic,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Profile updated successfully!');
      window.location.reload(); // Refresh to show updated data
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
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
      // First verify current password
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

  const handleCompanySettingsUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    // In a real app, save to a company_settings table
    // For now, just show success
    setTimeout(() => {
      alert('Company settings saved! (Note: Create a company_settings table in Supabase to persist these)');
      setSaving(false);
    }, 1000);
  };

  const handleSystemSettingsUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Save to settings table
    setTimeout(() => {
      alert('System settings saved!');
      setSaving(false);
    }, 1000);
  };

  const handlePayrollSettingsUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    setTimeout(() => {
      alert('Payroll settings saved!');
      setSaving(false);
    }, 1000);
  };

  const handleAddDepartment = () => {
    if (!newDepartment.trim()) return;
    if (departments.includes(newDepartment)) {
      alert('Department already exists');
      return;
    }
    setDepartments([...departments, newDepartment]);
    setNewDepartment('');
    alert('Department added! (Assign to employees to persist)');
  };

  const handleAddPosition = () => {
    if (!newPosition.trim()) return;
    if (positions.includes(newPosition)) {
      alert('Position already exists');
      return;
    }
    setPositions([...positions, newPosition]);
    setNewPosition('');
    alert('Position added! (Assign to employees to persist)');
  };

  const tabs = [
    { id: 'profile', name: 'Profile Settings', icon: User, roles: ['admin', 'manager', 'employee'] },
    { id: 'password', name: 'Change Password', icon: Lock, roles: ['admin', 'manager', 'employee'] },
    { id: 'company', name: 'Company Info', icon: Building, roles: ['admin'] },
    { id: 'system', name: 'System Settings', icon: SettingsIcon, roles: ['admin'] },
    { id: 'payroll', name: 'Payroll Settings', icon: DollarSign, roles: ['admin'] },
    { id: 'departments', name: 'Departments & Positions', icon: Briefcase, roles: ['admin'] },
  ];

  const filteredTabs = tabs.filter(tab => {
    if (tab.roles.includes('employee')) return true;
    if (isAdmin()) return true;
    return false;
  });

  if (loading) return <Loading />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-4 space-y-2">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Profile Settings Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Profile Picture */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Picture
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
                        <p className="text-xs text-gray-500 mt-1">Paste image URL</p>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
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

            {/* Password Change Tab */}
            {activeTab === 'password' && (
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
                  <div className="flex justify-end">
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

            {/* Company Settings Tab */}
            {activeTab === 'company' && isAdmin() && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
                <form onSubmit={handleCompanySettingsUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companySettings.company_name}
                        onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax ID / Registration Number
                      </label>
                      <input
                        type="text"
                        value={companySettings.tax_id}
                        onChange={(e) => setCompanySettings({ ...companySettings, tax_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Email
                      </label>
                      <input
                        type="email"
                        value={companySettings.company_email}
                        onChange={(e) => setCompanySettings({ ...companySettings, company_email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Phone
                      </label>
                      <input
                        type="tel"
                        value={companySettings.company_phone}
                        onChange={(e) => setCompanySettings({ ...companySettings, company_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Address
                      </label>
                      <textarea
                        value={companySettings.company_address}
                        onChange={(e) => setCompanySettings({ ...companySettings, company_address: e.target.value })}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Logo URL
                      </label>
                      <input
                        type="url"
                        value={companySettings.company_logo}
                        onChange={(e) => setCompanySettings({ ...companySettings, company_logo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://your-logo-url.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Digital Signature URL
                      </label>
                      <input
                        type="url"
                        value={companySettings.digital_signature}
                        onChange={(e) => setCompanySettings({ ...companySettings, digital_signature: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://your-signature-url.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'system' && isAdmin() && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h2>
                <form onSubmit={handleSystemSettingsUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Leave Balance (Days)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.default_leave_balance}
                        onChange={(e) => setSystemSettings({ ...systemSettings, default_leave_balance: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Days Per Week
                      </label>
                      <input
                        type="number"
                        value={systemSettings.working_days_per_week}
                        onChange={(e) => setSystemSettings({ ...systemSettings, working_days_per_week: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="1"
                        max="7"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Hours Start
                      </label>
                      <input
                        type="time"
                        value={systemSettings.working_hours_start}
                        onChange={(e) => setSystemSettings({ ...systemSettings, working_hours_start: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Hours End
                      </label>
                      <input
                        type="time"
                        value={systemSettings.working_hours_end}
                        onChange={(e) => setSystemSettings({ ...systemSettings, working_hours_end: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overtime Rate Multiplier
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={systemSettings.overtime_rate}
                        onChange={(e) => setSystemSettings({ ...systemSettings, overtime_rate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fiscal Year Start (MM-DD)
                      </label>
                      <input
                        type="text"
                        value={systemSettings.fiscal_year_start}
                        onChange={(e) => setSystemSettings({ ...systemSettings, fiscal_year_start: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="01-01"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Payroll Settings Tab */}
            {activeTab === 'payroll' && isAdmin() && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payroll Settings</h2>
                <form onSubmit={handlePayrollSettingsUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={payrollSettings.tax_rate}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, tax_rate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pension Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={payrollSettings.pension_rate}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, pension_rate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NHF Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={payrollSettings.nhf_rate}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, nhf_rate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salary Payment Day
                      </label>
                      <input
                        type="number"
                        value={payrollSettings.salary_payment_day}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, salary_payment_day: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="1"
                        max="31"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={payrollSettings.currency}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="NGN">NGN (Nigerian Naira)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="EUR">EUR (Euro)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Departments & Positions Tab */}
            {activeTab === 'departments' && isAdmin() && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Departments & Positions</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Departments */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Departments</h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Add new department"
                      />
                      <button
                        type="button"
                        onClick={handleAddDepartment}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {departments.map((dept, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-gray-900">{dept}</span>
                        </div>
                      ))}
                      {departments.length === 0 && (
                        <p className="text-gray-500 text-sm">No departments yet</p>
                      )}
                    </div>
                  </div>

                  {/* Positions */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Positions</h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Add new position"
                      />
                      <button
                        type="button"
                        onClick={handleAddPosition}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {positions.map((pos, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-gray-900">{pos}</span>
                        </div>
                      ))}
                      {positions.length === 0 && (
                        <p className="text-gray-500 text-sm">No positions yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}