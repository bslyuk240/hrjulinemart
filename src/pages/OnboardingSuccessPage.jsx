import React from 'react';
import { CheckCircle, Mail, Clock, FileText } from 'lucide-react';

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Form Submitted Successfully!
          </h1>
          <p className="text-lg text-white/90">
            Thank you for completing your onboarding
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Success Message */}
          <div className="text-center space-y-3">
            <p className="text-lg text-gray-700">
              Your onboarding information has been received by our HR team.
            </p>
            <p className="text-gray-600">
              We appreciate you taking the time to complete all the required information.
            </p>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              What Happens Next?
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reference Verification</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    We will contact the references you provided to verify your employment history.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Document Review</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Our HR team will review all the documents you've uploaded.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Final Approval</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Once everything is verified, we'll send you a confirmation email with next steps.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Notification */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start gap-3">
            <Mail className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Check Your Email</h3>
              <p className="text-sm text-gray-600">
                You'll receive a confirmation email shortly. We'll also notify you once your 
                onboarding is approved and you're ready to start.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 flex items-start gap-3">
            <Clock className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Expected Timeline</h3>
              <p className="text-sm text-gray-600">
                The review process typically takes <strong>3-5 business days</strong>. 
                If we need any additional information, we'll contact you directly.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you have any questions about your application, please contact our HR team:
            </p>
            <div className="flex flex-col items-center gap-2 text-sm">
              <a 
                href="mailto:admin@julinemart.com" 
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                admin@julinemart.com
              </a>
              <p className="text-gray-500">
                or call us at: <span className="font-medium text-gray-700">+2347075825761</span>
              </p>
            </div>
          </div>

          {/* Close Window Note */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-400">
              You can safely close this window now.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
