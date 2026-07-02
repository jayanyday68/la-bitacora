import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const PROPERTY_SLUG = 'la-fortuna'

export default function Submit() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 15 * 1024 * 1024) {
      setError('File is too large — please keep it under 15MB.')
      return
    }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file || !caption.trim()) {
      setError('Add a photo and a short caption.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', PROPERTY_SLUG)
        .single()

      const ext = file.name.split('.').pop()
      const path = `guest/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('moments-media')
        .upload(path, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('moments-media').getPublicUrl(path)

      const { error: insertError } = await supabase.from('moments').insert({
        property_id: property.id,
        caption: caption.trim(),
        media_url: urlData.publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image',
        submitted_by_type: 'guest',
        submitted_by_name: name.trim() || null,
        submitted_by_instagram: instagram.trim() || null,
      })

      if (insertError) throw insertError
      setDone(true)
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-6">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-viajero-orange/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🐆</span>
          </div>
          <h1 className="font-display text-2xl text-viajero-gray mb-2">Thanks for sharing!</h1>
          <p className="text-sm text-viajero-gray/60 mb-6">
            Your moment is in review — once approved it'll show up on the feed.
          </p>
          <Link to="/" className="text-viajero-orange text-sm font-semibold">
            ← Back to the feed
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-5 py-6">
      <div className="max-w-md mx-auto">
        <Link to="/" className="text-sm text-viajero-gray/50 mb-4 inline-block">
          ← Back
        </Link>
        <h1 className="font-display text-2xl text-viajero-gray mb-1">Share your moment</h1>
        <p className="text-sm text-viajero-gray/60 mb-6">
          What happened today? Staff will review before it goes live.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <div className="border-2 border-dashed border-viajero-gray/20 rounded-2xl aspect-square flex items-center justify-center overflow-hidden bg-white cursor-pointer">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-viajero-gray/40 text-sm">Tap to add a photo</span>
              )}
            </div>
            <input type="file" accept="image/*,video/*" capture="environment" onChange={handleFile} className="hidden" />
          </label>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What was happening? (one line is perfect)"
            rows={2}
            className="w-full rounded-xl border border-viajero-gray/15 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-viajero-orange/40"
          />

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full rounded-xl border border-viajero-gray/15 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-viajero-orange/40"
          />

          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="Instagram handle (optional)"
            className="w-full rounded-xl border border-viajero-gray/15 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-viajero-orange/40"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-viajero-orange text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Submit moment'}
          </button>
        </form>
      </div>
    </div>
  )
}
