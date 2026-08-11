'use client'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setMessage(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-black flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#FDC214] opacity-[0.08] pointer-events-none" />
      <div className="absolute -bottom-16 -left-32 w-96 h-96 rounded-full bg-[#FDC214] opacity-[0.05] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-12">
          <p className="font-head text-gold text-5xl tracking-widest uppercase">BLKUZZ</p>
          <p className="text-white/30 text-xs tracking-widest uppercase mt-2">Reset Password</p>
        </div>

        {message ? (
          <p className="text-center text-white/60 text-sm">{message}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-center text-white/40 text-xs mb-2 whitespace-nowrap">We&apos;ll email you a link to reset your password.</p>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-transparent border border-[#FDC214] text-[#FDC214] placeholder-[#FDC214] px-5 py-3 rounded-full text-sm text-center focus:outline-none focus:border-gold transition-colors"
            />

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-black font-head uppercase tracking-widest text-sm py-3 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-center text-white/30 text-xs mt-8">
          <a href="/portal/login" className="font-head text-gold" style={{ letterSpacing: '2px' }}>Back to Login</a>
        </p>
      </div>
    </main>
  )
}
