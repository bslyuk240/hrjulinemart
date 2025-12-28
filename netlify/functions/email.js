import nodemailer from 'nodemailer';

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const getEnv = (name, fallback = '') => process.env[name] || fallback;

const getEmailConfig = () => {
  const host = getEnv('SMTP_HOST', getEnv('VITE_SMTP_HOST', 'smtp.gmail.com'));
  const port = parseInt(getEnv('SMTP_PORT', getEnv('VITE_SMTP_PORT', '587')), 10);
  const user = getEnv('SMTP_USER', getEnv('VITE_SMTP_USER'));
  const pass = getEnv('SMTP_PASSWORD', getEnv('VITE_SMTP_PASSWORD'));

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
};

const COMPANY_NAME = getEnv('COMPANY_NAME', getEnv('VITE_COMPANY_NAME', 'JulineMart'));
const APP_URL = getEnv('APP_URL', getEnv('VITE_APP_URL', 'http://localhost:5173'));
const FROM_EMAIL = getEnv('SMTP_USER', getEnv('VITE_SMTP_USER'));

const ensureEmailConfig = () => {
  const config = getEmailConfig();
  if (!config.auth.user || !config.auth.pass) {
    return 'SMTP credentials are missing. Set SMTP_USER and SMTP_PASSWORD.';
  }
  return null;
};

const buildOnboardingEmail = (candidateName, position, onboardingToken) => {
  const onboardingUrl = `${APP_URL}/onboarding/${onboardingToken}`;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 14);
  const formattedExpiry = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    subject: `Welcome to ${COMPANY_NAME} - Complete Your Onboarding`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${COMPANY_NAME}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
    <div style="background: #4f46e5; color: #fff; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">Welcome to ${COMPANY_NAME}</h1>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${candidateName},</p>
      <p>We are excited to have you join our team as <strong>${position}</strong>.</p>
      <p>Please use the link below to complete your onboarding form:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${onboardingUrl}" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px;">Start Onboarding</a>
      </p>
      <p><strong>Important:</strong> This link will expire on ${formattedExpiry}.</p>
      <p>If you have any questions, please contact HR.</p>
      <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
};

const buildReferenceRequestEmail = (refereeName, candidateName, position, referenceToken) => {
  const referenceUrl = `${APP_URL}/reference/${referenceToken}`;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 14);
  const formattedExpiry = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    subject: `Employment Reference Request - ${candidateName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reference Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
    <div style="background: #4f46e5; color: #fff; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">Reference Request</h1>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${refereeName},</p>
      <p>${candidateName} has applied for the position of <strong>${position}</strong> with ${COMPANY_NAME} and has listed you as a referee.</p>
      <p>Please complete the reference form using the link below:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${referenceUrl}" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px;">Complete Reference Form</a>
      </p>
      <p><strong>Important:</strong> This link will expire on ${formattedExpiry}.</p>
      <p>Thank you for your time and assistance.</p>
      <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
};

const buildReferenceReminderEmail = (refereeName, candidateName, position, referenceToken) => {
  const referenceUrl = `${APP_URL}/reference/${referenceToken}`;

  return {
    subject: `Reminder: Reference Request for ${candidateName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reference Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px;">
    <p>Dear ${refereeName},</p>
    <p>This is a reminder to complete the reference for <strong>${candidateName}</strong> (${position}).</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${referenceUrl}" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px;">Complete Reference Form</a>
    </p>
    <p>Thank you for your help.</p>
    <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>
  </div>
</body>
</html>
    `.trim(),
  };
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport(getEmailConfig());
  const info = await transporter.sendMail({
    from: `"${COMPANY_NAME} HR" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
  return info;
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed.' });
  }

  const configError = ensureEmailConfig();
  if (configError) {
    return jsonResponse(500, { success: false, error: configError });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    payload = {};
  }

  const path = event.path || '';

  try {
    if (path.endsWith('/onboarding')) {
      const { candidateEmail, candidateName, position, onboardingToken } = payload;
      if (!candidateEmail || !candidateName || !position || !onboardingToken) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildOnboardingEmail(candidateName, position, onboardingToken);
      const info = await sendMail({ to: candidateEmail, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Onboarding email sent successfully.' });
    }

    if (path.endsWith('/reference-request')) {
      const { refereeEmail, refereeName, candidateName, position, referenceToken } = payload;
      if (!refereeEmail || !refereeName || !candidateName || !position || !referenceToken) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildReferenceRequestEmail(refereeName, candidateName, position, referenceToken);
      const info = await sendMail({ to: refereeEmail, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Reference request sent successfully.' });
    }

    if (path.endsWith('/reference-reminder')) {
      const { refereeEmail, refereeName, candidateName, position, referenceToken } = payload;
      if (!refereeEmail || !refereeName || !candidateName || !position || !referenceToken) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildReferenceReminderEmail(refereeName, candidateName, position, referenceToken);
      const info = await sendMail({ to: refereeEmail, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Reference reminder sent successfully.' });
    }

    if (path.endsWith('/test')) {
      const { recipientEmail } = payload;
      if (!recipientEmail) {
        return jsonResponse(400, { success: false, error: 'Missing recipientEmail.' });
      }
      const transporter = nodemailer.createTransport(getEmailConfig());
      await transporter.verify();
      const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject: 'Test Email - HR System',
        text: 'This is a test email to verify SMTP settings.',
      });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Email configuration is working.' });
    }

    return jsonResponse(404, { success: false, error: 'Endpoint not found.' });
  } catch (error) {
    console.error('Email function error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Failed to send email.' });
  }
};
