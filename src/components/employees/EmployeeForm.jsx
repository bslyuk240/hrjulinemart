import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { X, User } from 'lucide-react';

export default function EmployeeForm({ onClose, onSuccess, editEmployee = null }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_code: '',
    position: '',
    department: '',
    salary: '',
    join_date: '',
    leave_balance: 21,
    bank_name: '',
    bank_account: '',
    payment_mode: 'Bank',
    password: '',
    can_login: false,
    is_manager: false,
    profile_pic: '',
  });

  useEffect(() => {
    if (editEmployee) {
      setFormData({
        name: editEmployee.name || '',
        email: editEmployee.email || '',
        phone: editEmployee.phone || '',
        employee_code: editEmployee.employee_code || '',
        position: editEmployee.position || '',
        department: editEmployee.department || '',
        salary: editEmployee.salary || '',
        join_date: editEmployee.join_date || '',
        leave_balance: editEmployee.leave_balance || 21,
        bank_name: editEmployee.bank_name || '',
        bank_account: editEmployee.bank_account || '',
        payment_mode: editEmployee.payment_mode || 'Bank',
        password: '',
        can_login: editEmployee.can_login || false,
        is_manager: editEmployee.is_manager || false,
        profile_pic: editEmployee.profile_pic || '',
      });
    } else {
      generateEmployeeCode();
    }
  }, [editEmployee]);

  const generateEmployeeCode = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_code')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let newCode = 'EMP001';
      if (data && data.length > 0) {
        const lastCode = data[0].employee_code;
        const match = lastCode.match(/\d+$/);
        if (match) {
          const number = parseInt(match[0]) + 1;
          newCode = lastCode.replace(/\d+$/, String(number).padStart(3, '0'));
        }
      }

      setFormData(prev => ({ ...prev, employee_code: newCode }));
    } catch (error) {
      console.error('Error generating employee code:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('Please enter employee name');
      return false;
    }
    if (!formData.email.trim()) {
      alert('Please enter email address');
      return false;
    }
    if (!formData.employee_code.trim()) {
      alert('Please enter employee code');
      return false;
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      alert('Please enter a valid salary');
      return false;
    }
    if (!formData.join_date) {
      alert('Please select join date');
      return false;
    }
    if (!editEmployee && !formData.password) {
      alert('Please enter a password for new employee');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const employeeData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        employee_code: formData.employee_code.trim().toUpperCase(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        salary: parseFloat(formData.salary),
        join_date: formData.join_date,
        leave_balance: parseInt(formData.leave_balance) || 21,
        bank_name: formData.bank_name.trim(),
        bank_account: formData.bank_account.trim(),
        payment_mode: formData.payment_mode,
        can_login: formData.can_login,
        is_manager: formData.is_manager,
        profile_pic: formData.profile_pic.trim(),
      };

      if (formData.password) {
        employeeData.password = formData.password;
      }

      let result;
      if (editEmployee) {
        result = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editEmployee.id);
      } else {
        result = await supabase
          .from('employees')
          .insert([employeeData]);
      }

      const { error } = result;

      if (error) throw error;

      alert(editEmployee ? 'Employee updated successfully!' : 'Employee added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">
            {editEmployee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              Profile Picture
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Preview */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                  {formData.profile_pic ? (
                    <img
                      src={formData.profile_pic}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'text-white text-4xl font-bold';
                        fallback.textContent = (formData.name[0] || 'U').toUpperCase();
                        e.target.parentNode.appendChild(fallback);
                      }}
                    />
                  ) : (
                    <User className="w-16 h-16 text-white" />
                  )}
                </div>
              </div>

              {/* URL Input */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture URL
                </label>
                <input
                  type="url"
                  name="profile_pic"
                  value={formData.profile_pic}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://res.cloudinary.com/your-image.jpg"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload your image to Cloudinary, Imgur, or any image hosting service, then paste the direct URL here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Test URL: <button type="button" onClick={() => setFormData(prev => ({ ...prev, profile_pic: 'https://i.pravatar.cc/300' }))} className="text-purple-600 hover:underline">Use sample image</button>
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employee_code"
                  value={formData.employee_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              Employment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Salary (NGN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Join Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="join_date"
                  value={formData.join_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Balance (Days)
                </label>
                <input
                  type="number"
                  name="leave_balance"
                  value={formData.leave_balance}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              Bank Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Zenith Bank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  name="bank_account"
                  value={formData.bank_account}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <select
                  name="payment_mode"
                  value={formData.payment_mode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
          </div>

          {/* Login Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              Login Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {!editEmployee && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={editEmployee ? 'Leave blank to keep current' : 'Enter password'}
                  required={!editEmployee}
                />
                {editEmployee && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="can_login"
                    checked={formData.can_login}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Allow Login Access
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_manager"
                    checked={formData.is_manager}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Manager Privileges
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editEmployee ? 'Update Employee' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}