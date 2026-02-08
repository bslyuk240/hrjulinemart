import React, { useState } from 'react';
import { createVendorResponse } from '../services/vendorService';

const initialForm = {
  submitter_name: '',
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

const PUBLIC_SUBMITTER_LABEL = 'Public submission';

export default function PublicVendorSourcingPage() {
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.vendor_name || !formData.category || !formData.interest || !formData.onboarding) {
      setMessage({ type: 'error', text: 'Please complete all required fields.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const entryId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const payload = {
      ...formData,
      entry_id: entryId,
      device: navigator?.userAgent ?? 'unknown',
      submitted_by_id: null,
      submitted_by_name: (formData.submitter_name && formData.submitter_name.trim()) ? formData.submitter_name.trim() : PUBLIC_SUBMITTER_LABEL,
      submitted_by_email: null,
    };

    const result = await createVendorResponse(payload, null);

    setSubmitting(false);

    if (result.success) {
      setFormData(initialForm);
      setMessage({ type: 'success', text: 'Thank you! Your vendor information has been submitted. Our team will review it.' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Something went wrong. Please try again.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Simple header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800">Vendor Sourcing</h1>
          <p className="text-sm text-slate-500">Submit vendor information. No account required.</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {message && (
            <div
              role="alert"
              className={`mb-6 px-4 py-3 rounded-xl ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Your name</label>
                <input
                  name="submitter_name"
                  value={formData.submitter_name}
                  onChange={handleChange}
                  className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                  placeholder="Who is submitting this form"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Vendor Name *</label>
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
                  value={formData.vendor_phone}
                  onChange={handleChange}
                  className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                  placeholder="+234 800 123 4567"
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
                  placeholder="vendor@brand.com"
                />
              </div>
              <div className="md:col-span-2">
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
                <label className="text-xs font-semibold uppercase text-gray-500">Category *</label>
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
                <label className="text-xs font-semibold uppercase text-gray-500">Interest Level *</label>
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
                <label className="text-xs font-semibold uppercase text-gray-500">Onboarding Type *</label>
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
                onClick={() => { setFormData(initialForm); setMessage(null); }}
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
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
