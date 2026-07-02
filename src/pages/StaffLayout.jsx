import { useEffect, useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function StaffLayout() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [staffProfile, setStaffProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('staff_users')
      .select('*')
      .eq('auth_id', session.user.id)
      .single()
      .then(({ data }) => setStaffProfile(data))
  }, [session])

  if (session === undefined) {
    return <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-viajero-gray/40 text-sm">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/staff/login" replace />
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <header className="bg-viajero-gray px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-viajero-orange font-semibold">Staff</p>
          <p className="text-white text-sm font-medium">{staffProfile?.name || session.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-white/50 text-xs font-medium"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-md mx-auto px-5 py-6">
        <Outlet context={{ staffProfile }} />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5">
        <div className="max-w-md mx-auto grid grid-cols-2">
          <NavLink
            to="/staff/post"
            className={({ isActive }) =>
              `text-center py-3.5 text-sm font-semibold ${isActive ? 'text-viajero-orange' : 'text-viajero-gray/40'}`
            }
          >
            Quick Post
          </NavLink>
          <NavLink
            to="/staff/moderate"
            className={({ isActive }) =>
              `text-center py-3.5 text-sm font-semibold ${isActive ? 'text-viajero-orange' : 'text-viajero-gray/40'}`
            }
          >
            Moderate
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
