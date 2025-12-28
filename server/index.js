import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());

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

const createTransporter = () => nodemailer.createTransport(getEmailConfig());

const ensureEmailConfig = () => {
  const config = getEmailConfig();
  if (!config.auth.user || !config.auth.pass) {
    return 'SMTP credentials are missing. Set SMTP_USER and SMTP_PASSWORD (or VITE_SMTP_USER/VITE_SMTP_PASSWORD).';
  }
  return null;
};

app.post('/api/email/onboarding', async (req, res) => {
  const { candidateEmail, candidateName, position, onboardingToken } = req.body || {};
  if (!candidateEmail || !candidateName || !position || !onboardingToken) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const configError = ensureEmailConfig();
  if (configError) {
    return res.status(500).json({ success: false, error: configError });
  }

  try {
    const transporter = createTransporter();
    const { subject, html } = buildOnboardingEmail(candidateName, position, onboardingToken);
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME} HR" <${FROM_EMAIL}>`,
      to: candidateEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId, message: 'Onboarding email sent successfully.' });
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send email.' });
  }
});

app.post('/api/email/reference-request', async (req, res) => {
  const { refereeEmail, refereeName, candidateName, position, referenceToken } = req.body || {};
  if (!refereeEmail || !refereeName || !candidateName || !position || !referenceToken) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const configError = ensureEmailConfig();
  if (configError) {
    return res.status(500).json({ success: false, error: configError });
  }

  try {
    const transporter = createTransporter();
    const { subject, html } = buildReferenceRequestEmail(refereeName, candidateName, position, referenceToken);
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME} HR" <${FROM_EMAIL}>`,
      to: refereeEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId, message: 'Reference request sent successfully.' });
  } catch (error) {
    console.error('Error sending reference request email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send email.' });
  }
});

app.post('/api/email/reference-reminder', async (req, res) => {
  const { refereeEmail, refereeName, candidateName, position, referenceToken } = req.body || {};
  if (!refereeEmail || !refereeName || !candidateName || !position || !referenceToken) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const configError = ensureEmailConfig();
  if (configError) {
    return res.status(500).json({ success: false, error: configError });
  }

  try {
    const transporter = createTransporter();
    const { subject, html } = buildReferenceReminderEmail(refereeName, candidateName, position, referenceToken);
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME} HR" <${FROM_EMAIL}>`,
      to: refereeEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId, message: 'Reference reminder sent successfully.' });
  } catch (error) {
    console.error('Error sending reference reminder email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send email.' });
  }
});

app.post('/api/email/test', async (req, res) => {
  const { recipientEmail } = req.body || {};
  if (!recipientEmail) {
    return res.status(400).json({ success: false, error: 'Missing recipientEmail.' });
  }

  const configError = ensureEmailConfig();
  if (configError) {
    return res.status(500).json({ success: false, error: configError });
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: 'Test Email - HR System',
      text: 'This is a test email to verify SMTP settings.',
    });

    return res.json({ success: true, messageId: info.messageId, message: 'Email configuration is working.' });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send email.' });
  }
});

const port = parseInt(getEnv('PORT', '3001'), 10);
app.listen(port, () => {
  console.log(`Email server listening on port ${port}`);
});
