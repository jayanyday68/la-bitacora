import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function StaffQuickPost() {
  const { staffProfile } = useOutletContext()
  const [pillars, setPillars] = useState([])
  const [pillarId, setPillarId] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [activityTag, setActivityTag] = useState('')
  const [posting, setPosting] = useState(false)
  const [justPosted, setJustPosted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!staffProfile) return
    supabase
      .from('pillars')
      .select('*')
      .eq('property_id', staffProfile.property_id)
      .order('sort_order')
      .then(({ data }) => {
        setPillars(data || [])
        if (data?.[0]) setPillarId(data[0].id)
      })
  }, [staffProfile])

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setCaption('')
    setActivityTag('')
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!file || !caption.trim()) {
      setError('Add a photo and a caption.')
      return
    }
    setPosting(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `staff/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('moments-media')
        .upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('moments-media').getPublicUrl(path)

      const { error: insertError } = await supabase.from('moments').insert({
        property_id: staffProfile.property_id,
        pillar_id: pillarId || null,
        activity_tag: activityTag.trim() || null,
        caption: caption.trim(),
        media_url: urlData.publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image',
        submitted_by_type: 'staff',
        approved_by: staffProfile.id,
      })
      if (insertError) throw insertError

      reset()
      setJustPosted(true)
      setTimeout(() => setJustPosted(false), 2000)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-viajero-gray mb-4">Quick Post</h1>

      {justPosted && (
        <div className="bg-green-50 text-green-700 text-sm font-medium rounded-xl px-4 py-3 mb-4">
          Posted — live on the feed now ✓
        </div>
      )}

      <form onSubmit={handlePost} className="space-y-4">
        <label className="block">
          <div className="border-2 border-dashed border-viajero-gray/20 rounded-2xl aspect-square flex items-center justify-center overflow-hidden bg-white cursor-pointer">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-viajero-gray/40 text-sm">Tap to take/add a photo</span>
            )}
          </div>
          <input type="file" accept="image/*,video/*" capture="environment" onChange={handleFile} className="hidden" />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {pillars.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPillarId(p.id)}
              className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-full transition ${
                pillarId === p.id ? 'text-white' : 'text-viajero-gray/60 bg-white border border-viajero-gray/15'
              }`}
              style={pillarId === p.id ? { backgroundColor: p.color } : {}}
            >
              {p.name}
            </button>
          ))}
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="One-line caption"
          rows={2}
          className="w-full rounded-xl border border-viajero-gray/15 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-viajero-orange/40"
        />

        <input
          value={activityTag}
          onChange={(e) => setActivityTag(e.target.value)}
          placeholder="Activity tag (optional — e.g. GLACIAR, Bean to Bar)"
          className="w-full rounded-xl border border-viajero-gray/15 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-viajero-orange/40"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={posting}
          className="w-full bg-viajero-orange text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-50"
        >
          {posting ? 'Posting…' : 'Post to feed'}
        </button>
      </form>
    </div>
  )
}
