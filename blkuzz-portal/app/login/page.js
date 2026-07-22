'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      username: form.username.trim(),
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid username or password.')
    } else {
      router.push('/home')
    }
  }

  return (
    <main className="relative min-h-screen bg-black flex items-center justify-center p-6 overflow-hidden">

      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#FDC214] opacity-[0.08] pointer-events-none" />
      <div className="absolute -top-16 left-3/4 w-48 h-48 rounded-full bg-[#FDC214] opacity-[0.06] pointer-events-none" />
      <div className="absolute -bottom-16 -left-32 w-96 h-96 rounded-full bg-[#FDC214] opacity-[0.05] pointer-events-none" />
      <div className="absolute bottom-24 -right-8 w-28 h-28 rounded-full bg-[#FDC214] opacity-[0.08] pointer-events-none" />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-12">
          <p className="font-head text-gold text-5xl tracking-widest uppercase">BLKUZZ</p>
          <p className="text-white/30 text-xs tracking-widest uppercase mt-2">Member Portal</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            name="username"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={handle}
            required
            autoComplete="username"
            className="w-full bg-transparent border border-[#FDC214] text-[#FDC214] placeholder-[#FDC214] px-5 py-3 rounded-full text-sm text-center focus:outline-none focus:border-gold transition-colors"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handle}
            required
            autoComplete="current-password"
            className="w-full bg-transparent border border-[#FDC214] text-[#FDC214] placeholder-[#FDC214] px-5 py-3 rounded-full text-sm text-center focus:outline-none focus:border-gold transition-colors"
          />

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-black font-head uppercase tracking-widest text-sm py-3 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs mt-8">
          Not a member?{' '}
          <a href="/" className="font-head text-gold tracking-wide">Apply for Access</a>
        </p>

      </div>
    </main>
  )
}

