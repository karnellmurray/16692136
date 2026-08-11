import { Resend } from 'resend'

export async function sendPasswordResetEmail(to, resetUrl) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from:    process.env.EMAIL_FROM || 'BLKUZZ <onboarding@resend.dev>',
    to,
    subject: 'Reset your BLKUZZ password',
    html: `
      <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#f5f5f0;padding:32px">
        <p style="letter-spacing:4px;color:#FDC214;font-size:20px;margin:0 0 24px">BLKUZZ</p>
        <p>You asked to reset your password. This link expires in 1 hour.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#FDC214;color:#000;padding:12px 24px;border-radius:999px;text-decoration:none;display:inline-block">Reset Password</a>
        </p>
        <p style="color:rgba(245,245,240,0.5);font-size:12px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  })
}
