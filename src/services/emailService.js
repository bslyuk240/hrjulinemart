const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const postJson = async (path, payload) => {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to send email.',
    };
  }

  return data;
};

export const sendOnboardingEmail = async (
  candidateEmail,
  candidateName,
  position,
  onboardingToken
) => postJson('/api/email/onboarding', {
  candidateEmail,
  candidateName,
  position,
  onboardingToken,
});

export const sendReferenceRequestEmail = async (
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken
) => postJson('/api/email/reference-request', {
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken,
});

export const sendReferenceReminderEmail = async (
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken
) => postJson('/api/email/reference-reminder', {
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken,
});

export const testEmailConfiguration = async (testRecipient) => postJson('/api/email/test', {
  recipientEmail: testRecipient,
});
