import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function StaffLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/staff' },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-viajero-gray flex items-center justify-center px-6">
      <div className="max-w-xs w-full text-center">
        <p className="text-[11px] tracking-[0.2em] uppercase text-viajero-orange font-semibold mb-1">
          Staff Access
        </p>
        <h1 className="font-display text-3xl text-white mb-6">La Bitácora</h1>

        {sent ? (
          <p className="text-white/70 text-sm">
            Check your email for a magic link to sign in.
          </p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@viajerohostels.com"
              className="w-full rounded-xl px-4 py-3 text-[15px] focus:outline-none"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-viajero-orange text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
