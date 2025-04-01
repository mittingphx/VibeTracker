import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SendGrid API key not found! Email functionality will not work.');
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

    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'noreply@vibetracker.app',
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  const verificationLink = `${process.env.APP_URL || 'https://vibetracker.replit.app'}/verify-email?token=${token}`;
  
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