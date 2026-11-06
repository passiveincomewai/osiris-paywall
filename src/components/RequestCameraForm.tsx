'use client';

import { useId, useState } from 'react';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Request a camera — the demand capture shown where a search comes
   up empty (the globe SearchBar's no-results state, the country
   directory's empty state). Collapsed it is one quiet line; expanded
   it asks for the place (pre-filled from the failed search) and an
   optional notify-me email, then POSTs /api/camera-requests.
   The success copy is honest on purpose: it says we will LOOK for a
   feed there — some places have no legitimate public feed, so a
   camera is never promised. Visitors who instead HAVE a feed are
   routed to /submit-camera, the supply-side intake.
   ═══════════════════════════════════════════════════════════════ */

interface RequestCameraFormProps {
  /** Pre-fill for the place field — normally the failed search text. */
  initialPlace: string;
  /** The exact failed search query, when the surface has one. */
  query?: string | null;
}

type Phase = 'collapsed' | 'open' | 'sending' | 'done';

function readSessionId(): string | null {
  try {
    return sessionStorage.getItem('we_sid');
  } catch {
    return null;
  }
}

export default function RequestCameraForm({ initialPlace, query }: RequestCameraFormProps) {
  const [phase, setPhase] = useState<Phase>('collapsed');
  const [place, setPlace] = useState(initialPlace);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — real visitors never see it
  const [error, setError] = useState('');
  const uid = useId();
  const placeId = `${uid}-place`;
  const emailId = `${uid}-email`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === 'sending') return;
    setError('');
    setPhase('sending');
    try {
      const res = await fetch('/api/camera-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeText: place,
          query: query ?? undefined,
          email: email.trim() || undefined,
          sessionId: readSessionId() ?? undefined,
          website,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        setPhase('done');
        return;
      }
      setError(data?.error || 'Something went wrong — please try again.');
      setPhase('open');
    } catch {
      setError('Something went wrong — please try again.');
      setPhase('open');
    }
  };

  if (phase === 'done') {
    return (
      <div className="mt-4 w-full max-w-[360px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left" role="status">
        <p className="flex items-center gap-2 text-[13px] font-medium text-white/90">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#37e08b]" aria-hidden />
          Request noted — we&rsquo;ll look for a feed there.
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">
          Not every place has a public feed we can use, so we can&rsquo;t promise one will appear
          {email.trim() ? ' — if it does, we\u2019ll email you.' : '.'}
        </p>
      </div>
    );
  }

  if (phase === 'collapsed') {
    return (
      <div className="mt-4 flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => { setPlace(initialPlace); setPhase('open'); }}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.07)] text-[12.5px] font-medium text-[#ecd27a] hover:bg-[rgba(212,175,55,0.14)] transition-colors"
        >
          <Camera className="w-4 h-4" aria-hidden />
          Can&rsquo;t find it? Request this camera
        </button>
        <p className="text-[11px] text-white/40">
          Have a feed for this place instead?{' '}
          <a href="/submit-camera" className="underline decoration-white/30 underline-offset-2 hover:text-white/70">
            Submit a camera
          </a>
        </p>
      </div>
    );
  }

  const inputCls =
    'w-full h-10 rounded-lg border border-white/15 bg-black/40 px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[rgba(212,175,55,0.6)] transition-colors';
  const labelCls = 'block text-left text-[11px] font-medium uppercase tracking-[0.08em] text-white/45 mb-1.5';

  return (
    <form onSubmit={submit} className="mt-4 w-full max-w-[360px] rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
      <p className="text-[13px] font-medium text-white/90">Request this camera</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
        Tell us where you&rsquo;d like a camera. We&rsquo;ll look for a feed there — no promises, but every request guides what we add next.
      </p>

      <div className="mt-3.5">
        <label htmlFor={placeId} className={labelCls}>Place</label>
        <input
          id={placeId}
          value={place}
          onChange={e => setPlace(e.target.value)}
          maxLength={160}
          required
          autoComplete="off"
          placeholder="City, landmark, beach, road…"
          className={inputCls}
        />
      </div>

      <div className="mt-3">
        <label htmlFor={emailId} className={labelCls}>Email (optional)</label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Only if you want to hear when a feed appears"
          className={inputCls}
        />
      </div>

      {/* Honeypot: hidden from people, tempting to bots. A filled value
          makes the API answer success and store nothing. */}
      <div aria-hidden className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12px] leading-relaxed text-[#ff9d8a]">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={phase === 'sending' || place.trim().length < 2}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#D4AF37] text-[12.5px] font-semibold text-black hover:bg-[#e5c65a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {phase === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
          {phase === 'sending' ? 'Sending…' : 'Request this camera'}
        </button>
        <button
          type="button"
          onClick={() => setPhase('collapsed')}
          className="h-9 px-3 text-[12.5px] text-white/50 hover:text-white/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
