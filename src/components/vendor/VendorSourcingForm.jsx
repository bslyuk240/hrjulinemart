import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { createVendorResponse } from '../../services/vendorService';

const initialForm = {
  marketer_name: '',
  marketer_phone: '',
  marketer_email: '',
  vendor_name: '',
  contact_person: '',
  vendor_phone: '',
  vendor_email: '',
  business_address: '',
  category: '',
  sells_online: '',
  where_online: '',
  interest: '',
  onboarding: '',
  challenges: '',
  comments: '',
  image_links: '',
};

export default function VendorSourcingForm() {
  const { showSuccess, showError } = useApp();
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.marketer_name || !formData.vendor_name || !formData.category || !formData.interest || !formData.onboarding) {
      showError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);

    const entryId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const payload = {
      ...formData,
      entry_id: entryId,
      device: navigator?.userAgent ?? 'unknown',
    };

    const result = await createVendorResponse(payload, user?.id);

    setSubmitting(false);

    if (result.success) {
      setFormData(initialForm);
      showSuccess('Vendor entry captured. Managers notified.');
    } else {
      showError(result.error || 'Failed to save vendor entry.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Sourcing Form</h1>
        <p className="text-sm text-gray-500 mt-1">
          Capture vendor intelligence and notify the team in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Marketer Name*</label>
            <input
              name="marketer_name"
              value={formData.marketer_name}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Marketer Phone</label>
            <input
              type="tel"
              name="marketer_phone"
              value={formData.marketer_phone}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              placeholder="+234 800 123 4567"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Marketer Email</label>
            <input
              type="email"
              name="marketer_email"
              value={formData.marketer_email}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              placeholder="jane@julinemart.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Vendor Name*</label>
            <input
              name="vendor_name"
              value={formData.vendor_name}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              placeholder="Prime Accessories"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Contact Person</label>
            <input
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              placeholder="Mr. Adeyemi"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Vendor Phone</label>
            <input
              name="vendor_phone"
              type="tel"
              value={formData.vendor_phone}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Vendor Email</label>
            <input
              type="email"
              name="vendor_email"
              value={formData.vendor_email}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Business Address</label>
            <input
              name="business_address"
              value={formData.business_address}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Category*</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            >
              <option value="">Select category</option>
              <option>Accessories</option>
              <option>Beauty/Cosmetics</option>
              <option>Electronics</option>
              <option>Fashion</option>
              <option>Groceries</option>
              <option>Home & Living</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Sells Online</label>
            <select
              name="sells_online"
              value={formData.sells_online}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            >
              <option value="">Select option</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Where Online</label>
            <input
              name="where_online"
              value={formData.where_online}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              placeholder="Instagram, WhatsApp, Website..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Interest Level*</label>
            <select
              name="interest"
              value={formData.interest}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            >
              <option value="">Select interest</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Onboarding Type*</label>
            <select
              name="onboarding"
              value={formData.onboarding}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            >
              <option value="">Select type</option>
              <option>Self Registration</option>
              <option>Marketer Assistance</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Challenges</label>
            <input
              name="challenges"
              value={formData.challenges}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Comments</label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              rows="3"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="reset"
            onClick={() => setFormData(initialForm)}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Clear
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:opacity-90 transition-all disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
