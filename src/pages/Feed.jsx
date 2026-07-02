import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const PROPERTY_SLUG = 'la-fortuna'

function groupByDay(moments) {
  const groups = {}
  for (const m of moments) {
    const day = new Date(m.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    if (!groups[day]) groups[day] = []
    groups[day].push(m)
  }
  return groups
}

export default function Feed() {
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel
    async function load() {
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', PROPERTY_SLUG)
        .single()

      if (!property) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('moments')
        .select('*, pillars(name, color)')
        .eq('property_id', property.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(100)

      setMoments(data || [])
      setLoading(false)

      channel = supabase
        .channel('public-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'moments', filter: `property_id=eq.${property.id}` },
          () => load()
        )
        .subscribe()
    }
    load()
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const grouped = groupByDay(moments)

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="sticky top-0 z-10 bg-[#FAF8F5]/95 backdrop-blur border-b border-black/5">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-viajero-orange font-semibold">
              Viajero La Fortuna
            </p>
            <h1 className="font-display text-2xl text-viajero-gray leading-tight">La Bitácora</h1>
          </div>
          <Link
            to="/submit"
            className="shrink-0 bg-viajero-orange text-white text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition"
          >
            Share yours
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-6">
        {loading && (
          <p className="text-center text-viajero-gray/50 py-16 text-sm">Loading today's moments…</p>
        )}

        {!loading && moments.length === 0 && (
          <div className="text-center py-20">
            <p className="font-display text-xl text-viajero-gray mb-2">Nothing here yet</p>
            <p className="text-sm text-viajero-gray/60">Check back soon — today is still being written.</p>
          </div>
        )}

        {Object.entries(grouped).map(([day, items]) => (
          <section key={day} className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-viajero-gray/40 mb-3">
              {day}
            </p>
            <div className="space-y-6">
              {items.map((m) => (
                <MomentCard key={m.id} moment={m} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="text-center text-[11px] text-viajero-gray/40 pb-8">
        La Fortuna, Costa Rica
      </footer>
    </div>
  )
}

function MomentCard({ moment }) {
  const pillar = moment.pillars
  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5">
      {moment.media_type === 'video' ? (
        <video src={moment.media_url} className="w-full aspect-square object-cover" controls />
      ) : (
        <img src={moment.media_url} alt={moment.caption} className="w-full aspect-square object-cover" loading="lazy" />
      )}
      <div className="p-4">
        {pillar && (
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-white mb-2"
            style={{ backgroundColor: pillar.color }}
          >
            {pillar.name}
          </span>
        )}
        <p className="text-viajero-gray text-[15px] leading-snug">{moment.caption}</p>
        {moment.submitted_by_name && (
          <p className="text-xs text-viajero-gray/50 mt-2">
            — {moment.submitted_by_name}
            {moment.submitted_by_instagram && ` · @${moment.submitted_by_instagram.replace('@', '')}`}
          </p>
        )}
      </div>
    </article>
  )
}
