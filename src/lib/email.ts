import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// Konfigurasi transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send email menggunakan nodemailer
 * @param options - Email options (to, subject, html, text)
 * @returns Promise dengan info email yang dikirim
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    // Verify transporter configuration
    await transporter.verify();

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'ERM Notification'}" <${process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to send email: ${message}`);
  }
}

/**
 * Test email configuration
 * Mengirim test email untuk memverifikasi konfigurasi SMTP
 */
export async function testEmailConfig(testEmail: string) {
  try {
    await transporter.verify();
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: testEmail,
      subject: 'Test Email Configuration - ERM App',
      html: `
        <h2>✅ Email Configuration Test Successful</h2>
        <p>Your SMTP configuration is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
