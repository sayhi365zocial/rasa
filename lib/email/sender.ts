/**
 * Email Sender Service - Postmark SMTP Implementation
 *
 * This module provides email sending functionality using Postmark via SMTP.
 * Uses nodemailer with Postmark SMTP credentials.
 *
 * Environment variables required:
 * - SMTP_HOST (smtp.postmarkapp.com)
 * - SMTP_PORT (587)
 * - SMTP_USER (Postmark Server API Token)
 * - SMTP_PASSWORD (Postmark Server API Token - same as user)
 * - SMTP_FROM (verified sender email)
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

// Create transporter using Postmark SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.postmarkapp.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options

  try {
    console.log('📧 Sending email via Postmark SMTP...')
    console.log('To:', to)
    console.log('Subject:', subject)

    // Send email via SMTP
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || undefined,
    })

    console.log('✅ Email sent successfully via Postmark SMTP')
    console.log('Message ID:', info.messageId)
    console.log('Accepted recipients:', info.accepted)

    return true
  } catch (error) {
    console.error('❌ Failed to send email via Postmark SMTP:', error)

    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return false
  }
}

export async function sendDailySummaryToOwner(
  ownerEmail: string,
  htmlContent: string,
  textContent?: string
): Promise<boolean> {
  return sendEmail({
    to: ownerEmail,
    subject: `📊 สรุปยอดขายประจำวัน - ${new Date().toLocaleDateString('th-TH')}`,
    html: htmlContent,
    text: textContent,
  })
}
