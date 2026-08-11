'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router        = useRouter()
  const token          = searchParams.get('token')

  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword]  = useState('')
  const [message, setMessage]                  = useState('')
  const [error, setError]                      = useState('')
  const [loading, setLoading]                  = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setMessage('Password updated. You can now log in.')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return <p className="text-center text-sm" style={{ color: '#FF0000' }}>This reset link is missing a token. Please request a new one from the <a href="/forgot-password" className="text-gold underline">forgot password</a> page.</p>
  }

  return (
    <>
      {message ? (
        <p className="text-center text-white/60 text-sm">{message}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            name="password"
            type="password"
            placeholder="New Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-transparent border border-[#FDC214] text-[#FDC214] placeholder-[#FDC214] px-5 py-3 rounded-full text-sm text-center focus:outline-none focus:border-gold transition-colors"
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-transparent border border-[#FDC214] text-[#FDC214] placeholder-[#FDC214] px-5 py-3 rounded-full text-sm text-center focus:outline-none focus:border-gold transition-colors"
          />

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-black font-head uppercase tracking-widest text-sm py-3 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen bg-black flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#FDC214] opacity-[0.08] pointer-events-none" />
      <div className="absolute -bottom-16 -left-32 w-96 h-96 rounded-full bg-[#FDC214] opacity-[0.05] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-12">
          <p className="font-head text-gold text-5xl tracking-widest uppercase">BLKUZZ</p>
          <p className="text-white/30 text-xs tracking-widest uppercase mt-2">New Password</p>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-white/30 text-xs mt-8">
          <a href="/login" className="font-head text-gold" style={{ letterSpacing: '2px' }}>Back to Login</a>
        </p>
      </div>
    </main>
  )
}
