import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';

// Check for email verification disable flag
console.log('DISABLE_EMAIL_VERIFICATION value:', process.env.DISABLE_EMAIL_VERIFICATION);
const isEmailVerificationDisabled = process.env.DISABLE_EMAIL_VERIFICATION === 'true';
console.log('Email verification disabled flag:', isEmailVerificationDisabled);

if (isEmailVerificationDisabled) {
  console.log('Email verification is DISABLED via DISABLE_EMAIL_VERIFICATION environment variable');
  // Add this environment variable for the client-side
  process.env.VITE_DISABLE_EMAIL_VERIFICATION = 'true';
  // Log to confirm the client env var is set
  console.log('VITE_DISABLE_EMAIL_VERIFICATION set to:', process.env.VITE_DISABLE_EMAIL_VERIFICATION);
}

// Initialize SendGrid with API key - if email verification isn't disabled
if (process.env.SENDGRID_API_KEY && !isEmailVerificationDisabled) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API key is configured. Email functionality is enabled.');
  // Log a masked version of the API key for debugging
  const maskedKey = process.env.SENDGRID_API_KEY.substring(0, 4) + '...' + 
                    process.env.SENDGRID_API_KEY.substring(process.env.SENDGRID_API_KEY.length - 4);
  console.log('SendGrid API key (masked):', maskedKey);
} else if (!process.env.SENDGRID_API_KEY && !isEmailVerificationDisabled) {
  console.error('SendGrid API key not set. Email functionality will be disabled.');
} else {
  console.log('Email service initialization skipped due to disabled verification.');
}

// Log environment variables (without exposing secrets)
console.log('Environment variables for email:');
console.log('- APP_URL:', process.env.APP_URL || 'Not set');
console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');

// Set environment variables manually if they're not set
if (!process.env.APP_URL) {
  process.env.APP_URL = 'https://vibetracker.replit.app';
  console.log('Setting APP_URL to:', process.env.APP_URL);
}

// For SendGrid, we need to use a verified sender identity
// Make sure this email is verified in your SendGrid account
if (!process.env.EMAIL_FROM) {
  // Set this to an email that's verified in your SendGrid account
  process.env.EMAIL_FROM = 'noreply@vibetracker.app';  
  console.log('Setting EMAIL_FROM to:', process.env.EMAIL_FROM);
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key not set. Email not sent.');
      return false;
    }

    const fromEmail = process.env.EMAIL_FROM || 'noreply@vibetracker.app';
    console.log(`Sending email from: ${fromEmail} to: ${to}`);

    const msg = {
      to,
      from: fromEmail,
      subject,
      text,
      html,
    };

    try {
      await sgMail.send(msg);
      console.log(`Email successfully sent to ${to}`);
      return true;
    } catch (sendgridError: any) {
      console.error('SendGrid API Error:', sendgridError);
      if (sendgridError.response) {
        console.error('SendGrid API Error Details:', sendgridError.response.body);
      }
      return false;
    }
  } catch (error) {
    console.error('Error preparing email:', error);
    return false;
  }
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  // Use the API endpoint for verification, not a frontend route
  const verificationLink = `${process.env.APP_URL || 'https://vibetracker.replit.app'}/api/verify-email?token=${token}`;
  console.log(`Generated verification link: ${verificationLink}`);
  
  const subject = 'Verify your VibeTracker email';
  const text = `Hi ${username},\n\nPlease verify your email by clicking the following link: ${verificationLink}\n\nIf you didn't sign up for VibeTracker, you can ignore this email.\n\nThanks,\nThe VibeTracker Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007AFF;">VibeTracker Email Verification</h2>
      <p>Hi ${username},</p>
      <p>Please verify your email by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" 
           style="background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #555;">${verificationLink}</p>
      <p>If you didn't sign up for VibeTracker, you can ignore this email.</p>
      <p>Thanks,<br>The VibeTracker Team</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}