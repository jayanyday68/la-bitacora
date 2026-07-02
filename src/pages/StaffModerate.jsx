import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function StaffModerate() {
  const { staffProfile } = useOutletContext()
  const [pending, setPending] = useState([])
  const [flagged, setFlagged] = useState([])
  const [recent, setRecent] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    if (!staffProfile) return
    const [{ data: pendingData }, { data: flaggedData }, { data: recentData }] = await Promise.all([
      supabase
        .from('moments')
        .select('*, pillars(name, color)')
        .eq('property_id', staffProfile.property_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('moments')
        .select('*, pillars(name, color)')
        .eq('property_id', staffProfile.property_id)
        .eq('flagged_for_reuse', true)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('moments')
        .select('*, pillars(name, color)')
        .eq('property_id', staffProfile.property_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(30),
    ])
    setPending(pendingData || [])
    setFlagged(flaggedData || [])
    setRecent(recentData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [staffProfile])

  async function decide(id, status) {
    setPending((p) => p.filter((m) => m.id !== id))
    await supabase
      .from('moments')
      .update({ status, approved_at: new Date().toISOString(), approved_by: staffProfile.id })
      .eq('id', id)
  }

  async function toggleFlag(id, current) {
    await supabase.from('moments').update({ flagged_for_reuse: !current }).eq('id', id)
    loadAll()
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-viajero-gray mb-4">Moderate</h1>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('pending')}
          className={`text-sm font-semibold px-4 py-2 rounded-full ${
            tab === 'pending' ? 'bg-viajero-orange text-white' : 'bg-white text-viajero-gray/50 border border-viajero-gray/15'
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab('flagged')}
          className={`text-sm font-semibold px-4 py-2 rounded-full ${
            tab === 'flagged' ? 'bg-viajero-orange text-white' : 'bg-white text-viajero-gray/50 border border-viajero-gray/15'
          }`}
        >
          Flagged ({flagged.length})
        </button>
        <button
          onClick={() => setTab('recent')}
          className={`text-sm font-semibold px-4 py-2 rounded-full ${
            tab === 'recent' ? 'bg-viajero-orange text-white' : 'bg-white text-viajero-gray/50 border border-viajero-gray/15'
          }`}
        >
          Recent
        </button>
      </div>

      {loading && <p className="text-sm text-viajero-gray/40 text-center py-10">Loading…</p>}

      {!loading && tab === 'pending' && pending.length === 0 && (
        <p className="text-sm text-viajero-gray/40 text-center py-10">Queue is clear ✓</p>
      )}

      {tab === 'pending' &&
        pending.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 mb-4">
            <img src={m.media_url} alt={m.caption} className="w-full aspect-square object-cover" />
            <div className="p-4">
              <p className="text-viajero-gray text-[15px] mb-1">{m.caption}</p>
              {m.submitted_by_name && (
                <p className="text-xs text-viajero-gray/50 mb-3">
                  — {m.submitted_by_name}
                  {m.submitted_by_instagram && ` · @${m.submitted_by_instagram}`}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => decide(m.id, 'rejected')}
                  className="flex-1 bg-viajero-gray/10 text-viajero-gray font-semibold py-3 rounded-full active:scale-[0.98]"
                >
                  Reject
                </button>
                <button
                  onClick={() => decide(m.id, 'approved')}
                  className="flex-1 bg-viajero-orange text-white font-semibold py-3 rounded-full active:scale-[0.98]"
                >
                  Approve
                </button>
              </div>
              <button
                onClick={async () => {
                  await toggleFlag(m.id, false)
                  decide(m.id, 'approved')
                }}
                className="w-full text-xs font-semibold text-viajero-orange mt-2"
              >
                Approve & flag for newsletter
              </button>
            </div>
          </div>
        ))}

      {tab === 'flagged' && flagged.length === 0 && (
        <p className="text-sm text-viajero-gray/40 text-center py-10">Nothing flagged yet.</p>
      )}

      {tab === 'flagged' &&
        flagged.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 mb-4">
            <img src={m.media_url} alt={m.caption} className="w-full aspect-square object-cover" />
            <div className="p-4">
              {m.pillars && (
                <span
                  className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-white mb-2"
                  style={{ backgroundColor: m.pillars.color }}
                >
                  {m.pillars.name}
                </span>
              )}
              <p className="text-viajero-gray text-[15px] mb-3">{m.caption}</p>
              <button
                onClick={() => toggleFlag(m.id, true)}
                className="text-xs font-semibold text-viajero-gray/50"
              >
                Remove flag
              </button>
            </div>
          </div>
        ))}

      {tab === 'recent' && recent.length === 0 && (
        <p className="text-sm text-viajero-gray/40 text-center py-10">No approved moments yet.</p>
      )}

      {tab === 'recent' &&
        recent.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 mb-4">
            <img src={m.media_url} alt={m.caption} className="w-full aspect-square object-cover" />
            <div className="p-4">
              {m.pillars && (
                <span
                  className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-white mb-2"
                  style={{ backgroundColor: m.pillars.color }}
                >
                  {m.pillars.name}
                </span>
              )}
              <p className="text-viajero-gray text-[15px] mb-3">{m.caption}</p>
              <button
                onClick={() => toggleFlag(m.id, m.flagged_for_reuse)}
                className={`text-xs font-semibold ${m.flagged_for_reuse ? 'text-viajero-orange' : 'text-viajero-gray/50'}`}
              >
                {m.flagged_for_reuse ? '★ Flagged for newsletter' : '☆ Flag for newsletter'}
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}
