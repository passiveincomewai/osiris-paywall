'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Eye,
  Flag,
  MapPin,
  Shuffle,
  SkipForward,
  Target,
  Trophy,
} from 'lucide-react';
import {
  scoreGuess,
  shuffled,
  type GuessCountry,
  type GuessVerdict,
  type RouletteCamera,
} from '@/lib/random-camera';

/**
 * Random Camera Roulette — the game client.
 *
 * The server deals the first pool; this component runs the loop:
 * watch a live camera with every identifying label stripped, guess
 * its country from a searchable list, reveal, score, next. Pools top
 * up from /api/random-cameras as they run low. A camera whose feed has
 * not produced a frame within the watchdog window — or that errors —
 * is skipped silently: a dead feed should never cost the player a
 * round or a guess.
 *
 * Score lives in component state only (session score, by design).
 */

const LOAD_TIMEOUT_MS = 9000;
const SNAPSHOT_REFRESH_MS = 8000;

type Phase = 'guessing' | 'revealed';
type FeedState = 'loading' | 'live' | 'dead';

interface RoundResult {
  verdict: GuessVerdict;
  points: number;
  guessedName: string;
}

interface Score {
  rounds: number;
  nailed: number;
  close: number;
  points: number;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function bustCache(url: string, tick: number): string {
  if (tick === 0) return url;
  return `${url}${url.includes('?') ? '&' : '?'}we_r=${tick}`;
}

export default function RandomCameraRoulette({
  initialPool,
  countries,
}: {
  initialPool: RouletteCamera[];
  countries: GuessCountry[];
}) {
  const [pool, setPoolState] = useState<RouletteCamera[]>(initialPool);
  const poolRef = useRef(initialPool);
  const seenRef = useRef<Set<string>>(new Set(initialPool.map((c) => c.id)));
  const fetchingRef = useRef(false);

  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>('guessing');
  const phaseRef = useRef<Phase>('guessing');
  const [feedState, setFeedState] = useState<FeedState>('loading');
  const feedRef = useRef<FeedState>('loading');
  const [picked, setPicked] = useState<GuessCountry | null>(null);
  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [score, setScore] = useState<Score>({ rounds: 0, nailed: 0, close: 0, points: 0 });
  const [tick, setTick] = useState(0);

  const current: RouletteCamera | null = pool[pos] ?? null;
  const currentId = current?.id ?? null;

  const setFeed = useCallback((s: FeedState) => {
    feedRef.current = s;
    setFeedState(s);
  }, []);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const advance = useCallback(() => {
    setPhaseBoth('guessing');
    setPicked(null);
    setQuery('');
    setListOpen(false);
    setResult(null);
    setTick(0);
    setFeed('loading');
    if (pos + 1 < poolRef.current.length) {
      setPos(pos + 1);
    } else {
      // Pool exhausted and the top-up has not landed: recycle this
      // session's pool shuffled rather than dead-ending the game.
      const recycled = shuffled(poolRef.current);
      poolRef.current = recycled;
      setPoolState(recycled);
      setPos(0);
    }
  }, [pos, setFeed, setPhaseBoth]);

  /* ---- pool top-up ------------------------------------------------ */
  useEffect(() => {
    if (pool.length - pos >= 6 || fetchingRef.current) return;
    fetchingRef.current = true;
    fetch('/api/random-cameras?count=24')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { cameras?: RouletteCamera[] } | null) => {
        const fresh = (data?.cameras ?? []).filter((c) => !seenRef.current.has(c.id));
        if (fresh.length > 0) {
          fresh.forEach((c) => seenRef.current.add(c.id));
          setPoolState((prev) => {
            const next = [...prev, ...fresh];
            poolRef.current = next;
            return next;
          });
        }
      })
      .catch(() => {
        /* a failed top-up is invisible; advance() recycles the pool */
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [pool.length, pos]);

  /* ---- feed watchdog: a camera that never shows a frame is skipped - */
  useEffect(() => {
    if (!currentId) return;
    setFeed('loading');
    const t = window.setTimeout(() => {
      if (feedRef.current !== 'live' && phaseRef.current === 'guessing') advance();
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const onFeedError = useCallback(() => {
    // A feed that already produced frames gets the benefit of the
    // doubt — one failed snapshot refresh is a glitch, not a dead
    // camera. Only a feed that never came up is skipped.
    if (feedRef.current === 'live') return;
    if (phaseRef.current === 'guessing') advance();
    else setFeed('dead');
  }, [advance, setFeed]);

  /* ---- snapshot refresh: a still that updates is the proof of live -- */
  useEffect(() => {
    if (!current || current.feed !== 'snapshot') return;
    const iv = window.setInterval(() => setTick((t) => t + 1), SNAPSHOT_REFRESH_MS);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  /* ---- HLS playback (same lazy hls.js pattern as CameraViewer) ----- */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!current || current.feed !== 'hls') return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = current.url;
    } else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled || !videoRef.current) return;
          if (Hls.isSupported()) {
            const instance = new Hls({ enableWorker: false });
            hls = instance;
            instance.loadSource(current.url);
            instance.attachMedia(videoRef.current);
            instance.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) onFeedError();
            });
          } else {
            onFeedError();
          }
        })
        .catch(() => onFeedError());
    }
    return () => {
      cancelled = true;
      hls?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  /* ---- guessing ---------------------------------------------------- */
  const filteredCountries = (
    query.trim() === ''
      ? countries
      : countries.filter((c) => fold(c.name).includes(fold(query.trim())))
  ).slice(0, 12);

  const reveal = () => {
    if (!current || !picked) return;
    const { verdict, points } = scoreGuess(current, picked);
    setResult({ verdict, points, guessedName: picked.name });
    setScore((s) => ({
      rounds: s.rounds + 1,
      nailed: s.nailed + (verdict === 'nailed' ? 1 : 0),
      close: s.close + (verdict === 'close' ? 1 : 0),
      points: s.points + points,
    }));
    setPhaseBoth('revealed');
  };

  const verdictCopy: Record<GuessVerdict, { headline: string; tone: string }> = {
    nailed: { headline: 'Nailed it!', tone: 'text-emerald-300 border-emerald-300/30 bg-emerald-400/10' },
    close: { headline: 'Close — right region!', tone: 'text-amber-200 border-amber-200/30 bg-amber-300/10' },
    'way-off': { headline: 'Way off this time.', tone: 'text-red-200 border-red-300/30 bg-red-400/10' },
  };

  return (
    <section aria-label="Random Camera Roulette game" className="mt-10">
      {/* Scoreboard */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <Shuffle className="w-3.5 h-3.5 text-[#D4AF37]" /> Round {score.rounds + 1}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <Target className="w-3.5 h-3.5 text-emerald-300" /> Exact: {score.nailed}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-200" /> Close: {score.close}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" /> {score.points} pts
        </span>
        {feedState === 'live' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/30 bg-red-400/10 px-3 py-1.5 text-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
          </span>
        )}
      </div>

      {/* Stage — deliberately anonymous: no name, city or country is
          rendered anywhere near the feed until the reveal. */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {current && (current.feed === 'snapshot' || current.feed === 'mjpeg') && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.feed === 'snapshot' ? bustCache(current.url, tick) : current.url}
            alt="A live camera somewhere on Earth — guessing where it is, is the game"
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={() => setFeed('live')}
            onError={onFeedError}
          />
        )}
        {current && (current.feed === 'hls' || current.feed === 'mp4') && (
          <video
            key={current.id}
            ref={videoRef}
            src={current.feed === 'mp4' ? current.url : undefined}
            autoPlay
            muted
            playsInline
            loop={current.feed === 'mp4'}
            className="absolute inset-0 h-full w-full object-contain"
            onPlaying={() => setFeed('live')}
            onError={onFeedError}
          />
        )}
        {!current && (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm px-6 text-center">
            Dealing the next camera…
          </div>
        )}
        {current && feedState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white/70 text-sm px-6 text-center">
            <span className="w-8 h-8 rounded-full border-2 border-white/15 border-t-[#D4AF37] animate-spin" />
            Finding a live camera somewhere on Earth…
          </div>
        )}
        {current && feedState === 'dead' && phase === 'revealed' && (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white/60 text-xs px-4 py-2 text-center">
            This feed stopped during the reveal — the location below is still the answer.
          </div>
        )}
      </div>

      {/* Controls */}
      {phase === 'guessing' ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label htmlFor="roulette-country" className="flex items-center gap-2 font-semibold">
            <Flag className="w-4 h-4 text-[#D4AF37]" /> Which country is this camera in?
          </label>
          <div className="relative mt-3">
            <input
              id="roulette-country"
              type="text"
              value={picked ? picked.name : query}
              placeholder="Start typing a country — Japan, Brazil, Spain…"
              autoComplete="off"
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#D4AF37]/60 placeholder:text-white/30"
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setListOpen(true);
              }}
              onFocus={() => setListOpen(true)}
              onBlur={() => window.setTimeout(() => setListOpen(false), 150)}
            />
            {listOpen && (
              <ul
                role="listbox"
                aria-label="Countries"
                className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-white/15 bg-[#0a0e18] shadow-xl"
              >
                {filteredCountries.length === 0 && (
                  <li className="px-4 py-3 text-sm text-white/40">No country matches that — try another spelling.</li>
                )}
                {filteredCountries.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={picked?.slug === c.slug}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/[0.06]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setPicked(c);
                        setQuery('');
                        setListOpen(false);
                      }}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-white/35">{c.regionLabel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!picked}
              onClick={reveal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eye className="w-4 h-4" /> Reveal the answer
            </button>
            <button
              type="button"
              onClick={advance}
              className="inline-flex items-center gap-1.5 text-sm text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
            >
              <SkipForward className="w-4 h-4" /> Camera not playing? Skip it
            </button>
          </div>
          <p className="mt-3 text-xs text-white/35">
            Exact country: 100 pts · Right region of the world: 25 pts · The region column in the
            list is a hint we give everyone — reading the scene is still on you.
          </p>
        </div>
      ) : (
        current && result && (
          <div className={`mt-5 rounded-2xl border p-5 ${verdictCopy[result.verdict].tone}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">
                {verdictCopy[result.verdict].headline}{' '}
                <span className="text-base font-semibold text-white/70">+{result.points} pts</span>
              </h2>
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black"
              >
                Next camera <SkipForward className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-white/80">
              <MapPin className="mt-0.5 w-4 h-4 shrink-0 text-[#D4AF37]" />
              <span>
                This is <strong className="text-white">{current.name}</strong>
                {current.city ? ` — ${current.city}, ` : ' — '}
                {current.country} ({current.regionLabel}).
                {result.verdict !== 'nailed' && ` You guessed ${result.guessedName}.`}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/?camera=${encodeURIComponent(current.id)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/[0.06]"
              >
                <Eye className="w-4 h-4" /> Watch this camera on the globe
              </Link>
              <Link
                href={`/cameras/countries/${current.countrySlug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/[0.06]"
              >
                More cameras in {current.country}
              </Link>
            </div>
          </div>
        )
      )}
    </section>
  );
}
