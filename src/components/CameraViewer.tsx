'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, RefreshCw, MapPin, Camera, CameraOff, Maximize2, PlayCircle, Bookmark, Share2, Check, Copy } from 'lucide-react';
import type Hls from 'hls.js';
import { isHostedOffPlatform, liveFeedAtSource, localEmbed, needsResolution, offPlatformView } from '@/lib/camera-feed';
import { cameraShareId, cameraShareTitle, rememberLastCamera } from '@/lib/camera-share';
import { cameraAlt } from '@/lib/camera-alt';
import { ensureShareCode, shareEntity, shareUrl } from '@/lib/share/client';
import { buildEntityShareUrl } from '@/lib/share/links';
import ShareWithQR from './share/ShareWithQR';
import { clearLook, registerVideo } from '@/lib/vision/store';
import CameraVision from './CameraVision';
import CameraMiniMap from './CameraMiniMap';
import TimelapseControl from './TimelapseControl';
import AccountGatePrompt from './AccountGatePrompt';
import LiveRecordControl from './recording/LiveRecordControl';
import CameraAlertButton from './CameraAlertButton';
import SaveLocationButton from './SaveLocationButton';
import { cameraSavedHref } from '@/lib/saved-locations';

interface CameraViewerProps {
  camera: any | null;
  onClose: () => void;
  onLocate?: (lat: number, lng: number) => void;
  /** The OI panel is open on the right: sit beside it, so OI Assist's conversation stays readable while it looks. */
  besideOi?: boolean;
}

export default function CameraViewer({ camera, onClose, onLocate, besideOi = false }: CameraViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "signin" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [mapOpen, setMapOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrlText, setShareUrlText] = useState<string | null>(null);
  const [shareIsNew, setShareIsNew] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toISOString().split('T')[1].slice(0, 8) + 'Z');
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const camId = camera ? `CAM-${Math.abs(camera.lat * 10000).toFixed(0).padStart(4, '0').slice(-4)}-${Math.abs(camera.lng * 10000).toFixed(0).padStart(4, '0').slice(-4)}` : 'UNKNOWN';

  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const externalFeedUrl = camera?.external_url || camera?.feed_url;
  const hostedOffPlatform = isHostedOffPlatform(camera);

  /**
   * A SkylineWebcams page is usually a wrapper around a public YouTube
   * livestream published by the camera's actual operator, so it can play here
   * rather than sending the viewer off-platform. Resolved live rather than
   * baked into the camera data: a livestream that restarts comes back under a
   * new video id, and a baked id would work until it silently didn't.
   *
   * The answer is stored against the URL it belongs to. Keying it that way is
   * what makes switching cameras safe: a reply that arrives late carries the
   * previous key, so it is simply not read rather than painting the last
   * camera's stream into the current one. It also means neither `resolving`
   * nor the reset needs to be written back into state — both fall out of the
   * key comparison at render.
   */
  // A link that already names the video needs no lookup at all.
  const directEmbed = localEmbed(camera);
  // Snapshot cameras are checked too, in the background: the picture shows
  // immediately and is withdrawn only if the source says the camera is gone.
  const resolveKey: string | null =
    (needsResolution(camera) ? camera.external_url : null) ?? liveFeedAtSource(camera);
  const [resolution, setResolution] = useState<{ key: string; embed: string | null; offline: boolean; kind?: string } | null>(null);
  const resolvedEmbed = directEmbed ?? (resolution && resolution.key === resolveKey ? resolution.embed : null);
  const resolving = Boolean(resolveKey) && resolution?.key !== resolveKey;
  const offline = resolution?.key === resolveKey && resolution.offline;
  const gone = resolution?.key === resolveKey && resolution.kind === 'missing';

  // Live video exists at the source but cannot be replayed here, so offer the
  // way through to it and stop calling the still image a live feed.
  const watchLiveUrl = liveFeedAtSource(camera);

  useEffect(() => {
    if (!resolveKey) return;
    let live = true;
    fetch(`/api/cctv/resolve?url=${encodeURIComponent(resolveKey)}`)
      .then(r => r.json())
      .then(d => { if (live) setResolution({ key: resolveKey, embed: d?.embeddable ? d.embedUrl : null, offline: d?.kind === 'offline' || d?.kind === 'missing', kind: d?.kind }); })
      // A resolver failure is not a broken camera — it falls back to the link.
      .catch(() => { if (live) setResolution({ key: resolveKey, embed: null, offline: false }); });
    return () => { live = false; };
  }, [resolveKey]);

  // Remember the last camera opened on this device, so a visitor who
  // leaves to check out can be offered their way straight back to it
  // (lib/camera-share.ts — the /welcome loop reads it).
  useEffect(() => {
    rememberLastCamera(camera);
  }, [camera]);

  // The share panel shows the visitor their own link for this camera.
  // Resolve it only when the panel is first opened — the share code is
  // minted on need, never at render (lib/share/client). A signed-out
  // visitor's link is an anonymous device link until they activate it
  // as an affiliate, so for them the panel also offers activation.
  useEffect(() => {
    if (!shareOpen || shareUrlText) return;
    const id = cameraShareId(camera);
    if (!id) return;
    let live = true;
    (async () => {
      let signedIn = false;
      try {
        const s = await fetch('/api/auth/session', { cache: 'no-store' });
        const session = await s.json().catch(() => null);
        signedIn = Boolean(session?.user);
      } catch { /* unreachable session reads as signed out */ }
      const code = await ensureShareCode().catch(() => null);
      if (!live) return;
      setShareIsNew(!signedIn);
      setShareUrlText(buildEntityShareUrl({ kind: 'camera', id }, code));
    })();
    return () => { live = false; };
  }, [shareOpen, shareUrlText, camera]);

  const streamType = resolvedEmbed ? 'iframe' : (camera?.stream_type || 'jpg');
  const streamUrl: string | undefined = resolvedEmbed || camera?.stream_url;
  const view = offPlatformView({ hostedOffPlatform, resolving, resolvedEmbed, offline });
  const externalOnly = view !== 'inline';

  useEffect(() => {
    if (!camera) return;
    setLoading(true);
    setError(false);
    setImageUrl(null);
    setShareState("idle");
    setMapOpen(false);
    setShareOpen(false);
    setShareUrlText(null);
    setShareIsNew(false);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (externalOnly) {
      setLoading(false);
      return;
    }

    if (streamType === 'hls' && camera.stream_url) {
      // hls.js is a decoder most cameras never need (snapshots, MJPEG, MP4
      // and embeds dominate the catalogue), so it is imported only when an
      // HLS feed is actually opened — the same pattern CctvPreviews uses.
      // The decision order is unchanged: MSE support first, native HLS
      // second. The cancelled flag covers a camera switch mid-import; the
      // instance itself is still destroyed at the top of the next run.
      let cancelled = false;
      const hlsUrl = camera.stream_url;
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported() && videoRef.current) {
            const hls = new Hls({ enableWorker: false });
            hlsRef.current = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setLoading(false);
              videoRef.current?.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) setError(true);
            });
          } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = hlsUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
              setLoading(false);
              videoRef.current?.play().catch(() => {});
            });
          }
        })
        .catch(() => { if (!cancelled) setError(true); });
      return () => { cancelled = true; };
    }

    if (streamType === 'mjpeg' && camera.stream_url) {
      setLoading(false);
      return;
    }

    if ((streamType === 'iframe' || streamType === 'mp4') && streamUrl) {
      setLoading(false);
      return;
    }

    // JPG fallback
    const targetUrl = camera.feed_url || camera.stream_url;
    if (targetUrl) {
      const url = targetUrl.includes('?') ? `${targetUrl}&_t=${Date.now()}` : `${targetUrl}?_t=${Date.now()}`;
      setImageUrl(url);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [camera, streamType, streamUrl, externalOnly, retryCount]);

  // Auto-refresh for JPGs
  useEffect(() => {
    if (streamType !== 'jpg' || (!camera?.feed_url && !camera?.stream_url)) return;
    const targetUrl = camera.feed_url || camera.stream_url;
    if (!targetUrl) return;

    const iv = setInterval(() => {
      const url = targetUrl.includes('?') ? `${targetUrl}&_t=${Date.now()}` : `${targetUrl}?_t=${Date.now()}`;
      setImageUrl(url);
    }, 5000); // 5s refresh for JPG
    return () => clearInterval(iv);
  }, [camera, streamType]);

  // The detector reads a stream camera's frames from the <video> playing it.
  const cameraId: string | undefined = camera?.id;
  useEffect(() => {
    if (!cameraId || streamType !== 'hls') return;
    registerVideo(cameraId, videoRef.current);
    return () => registerVideo(cameraId, null);
    // A retry after an error mounts a new <video>: register that one.
  }, [cameraId, streamType, error, retryCount]);

  // A look belongs to the camera on screen: switching cameras or closing the viewer ends it.
  const lookedAt = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lookedAt.current && lookedAt.current !== cameraId) clearLook(lookedAt.current);
    lookedAt.current = cameraId;
  }, [cameraId]);

  if (!camera) return null;

  return (
    <AnimatePresence>
        <motion.div
          data-tour="camera-viewer"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0 }}
          className={`fixed z-[500] ${
            fullscreen 
              ? 'inset-2 md:inset-4' 
              : `bottom-[70px] left-2 right-2 md:bottom-6 ${besideOi ? 'md:right-[500px]' : 'md:right-6'} md:left-auto md:w-[480px]`
          }`}
        >
          <div className="overflow-hidden h-full flex flex-col bg-black/85 backdrop-blur-xl border border-[var(--border-primary)]" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.8)' }}>
            
            {/* Tactical Grid Overlay on background */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{
              backgroundImage: 'linear-gradient(var(--border-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />

            {/* Tactical Header */}
            <div className="flex flex-col border-b border-[var(--border-primary)] bg-black/60 relative z-10">
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between px-3 py-1 border-b border-white/5 text-[9px] font-mono tracking-[0.2em] text-[var(--text-muted)] bg-[var(--hover-accent)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--gold-primary)] font-bold">{camId}</span>
                  <span>{camera.lat?.toFixed(4)}, {camera.lng?.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{currentTime}</span>
                  <span className="text-[var(--gold-primary)]">SECURE UPLINK</span>
                </div>
              </div>

              {/* Main Title Bar */}
              <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex items-center justify-center w-6 h-6 border border-[var(--gold-primary)] bg-[var(--gold-primary)]/10 rounded-sm">
                    <Camera className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
                    <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-[var(--gold-primary)]" />
                    <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-[var(--gold-primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[11px] md:text-[12px] font-mono font-bold tracking-widest truncate text-white uppercase" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{camera.name}</h3>
                    <p className="text-[9px] md:text-[9px] font-mono text-[var(--gold-primary)] uppercase tracking-wider opacity-80">{camera.city}, {camera.country} • SOURCE: {camera.source}</p>
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {streamType === 'jpg' && (
                    <button 
                      onClick={() => {
                        const targetUrl = camera.feed_url || camera.stream_url;
                        if (targetUrl) {
                          const url = targetUrl.includes('?') ? `${targetUrl}&_t=${Date.now()}` : `${targetUrl}?_t=${Date.now()}`;
                          setImageUrl(url);
                        }
                      }} 
                      className="p-1.5 rounded-sm bg-white/5 border border-white/10 hover:bg-[var(--gold-primary)]/20 hover:border-[var(--gold-primary)] transition-all" title="Refresh feed" aria-label="Refresh feed"
                    >
                      <RefreshCw className="w-3 h-3 text-[var(--text-secondary)] hover:text-[var(--gold-primary)]" />
                    </button>
                  )}
                  {/* Only where a host offers somewhere to fly to (the globe).
                      A page context has no map behind it — a button that does
                      nothing there would be a dead control. */}
                  {camera.lat && camera.lng && onLocate && (
                    <button onClick={() => onLocate(camera.lat, camera.lng)} className="p-1.5 rounded-sm bg-white/5 border border-white/10 hover:bg-[var(--gold-primary)]/20 hover:border-[var(--gold-primary)] transition-all" title="Fly to location" aria-label="Fly to location">
                      <MapPin className="w-3 h-3 text-[var(--text-secondary)] hover:text-[var(--gold-primary)]" />
                    </button>
                  )}
                  <button onClick={() => setFullscreen(!fullscreen)} className="hidden md:block p-1.5 rounded-sm bg-white/5 border border-white/10 hover:bg-[var(--text-primary)]/20 hover:border-[var(--text-primary)] transition-all" title="Toggle fullscreen" aria-label="Toggle fullscreen">
                    <Maximize2 className="w-3 h-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
                  </button>
                  {/* Device-local save (star): the no-account shortlist in
                      /saved, distinct from the account bookmark beside it.
                      Only when the camera carries a catalogue id — the
                      same rule the share affordance follows. */}
                  {cameraShareId(camera) && (
                    <SaveLocationButton
                      variant="icon"
                      entry={{
                        kind: 'camera',
                        key: cameraShareId(camera)!,
                        label: camera.name || camera.title || 'Camera',
                        detail: [camera.city, camera.country].filter(Boolean).join(', ') || undefined,
                        href: cameraSavedHref(cameraShareId(camera)!),
                        lat: typeof camera.lat === 'number' ? camera.lat : undefined,
                        lng: typeof camera.lng === 'number' ? camera.lng : undefined,
                      }}
                    />
                  )}
                  <button
                    onClick={async () => {
                      setSaveState("saving");
                      try {
                        const r = await fetch("/api/recording/cameras", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: camera.name || camera.title || "Camera",
                            cameraData: {
                              id: camera.id,
                              stream_url: camera.stream_url,
                              feed_url: camera.feed_url,
                              external_url: camera.external_url,
                              stream_type: camera.stream_type,
                              lat: camera.lat,
                              lng: camera.lng,
                              name: camera.name || camera.title,
                            },
                          }),
                        });
                        if (r.ok) setSaveState("saved");
                        else setSaveState(r.status === 401 ? "signin" : "error");
                      } catch { setSaveState("error"); }
                      setTimeout(() => setSaveState("idle"), 6000);
                    }}
                    className="p-1.5 rounded-sm bg-white/5 border border-white/10 hover:bg-cyan-400/20 hover:border-cyan-400 transition-all"
                    title={saveState === "saved" ? "Saved to My Cameras!" : saveState === "signin" ? "Sign in to save cameras" : "Save to My Cameras"}
                    aria-label={saveState === "saved" ? "Saved to My Cameras" : "Save to My Cameras"}>
                    <Bookmark className={`w-3 h-3 ${saveState === "saved" ? "text-cyan-300" : "text-[var(--text-secondary)]"}`} />
                  </button>
                  <CameraAlertButton camera={camera} />
                  <button onClick={onClose} aria-label="Close camera viewer" title="Close camera viewer" className="p-1.5 rounded-sm bg-red-900/30 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500 transition-all ml-2">
                    <X className="w-4 h-4 md:w-3 md:h-3 text-red-400 hover:text-red-200" />
                  </button>
                </div>
              </div>
            </div>

          {saveState === "signin" && (
            <div className="px-3 py-2 border-b border-white/10 bg-black/60">
              <AccountGatePrompt compact feature="save-camera" />
            </div>
          )}
          {/* Camera Feed */}
          <div className={`relative bg-[#020202] ${fullscreen ? 'flex-1 overflow-hidden' : 'aspect-video max-h-[35vh] md:max-h-none'}`}>
            {/* Tactical CRT Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 2px)',
              backgroundSize: '100% 4px',
            }} />
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]" />

            {loading && !error && !externalOnly && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--gold-dim)', borderTopColor: 'transparent' }} />
                  <span className="text-[10px] font-mono tracking-[0.25em]" style={{ color: 'var(--gold-primary)' }}>DECRYPTING FEED...</span>
                </div>
              </div>
            )}

            {view === 'resolving' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-sm p-4 text-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: 'var(--gold-dim)', borderTopColor: 'transparent' }} />
                <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--gold-primary)' }}>ACQUIRING UPLINK</p>
                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-2 uppercase">Locating a direct feed</p>
              </div>
            ) : view === 'offline' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-sm p-4 text-center">
                <CameraOff className="w-6 h-6 mb-3 opacity-50 text-[var(--text-muted)]" />
                <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-secondary)]">{gone ? 'CAMERA WITHDRAWN' : 'CAMERA OFFLINE'}</p>
                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-2 max-w-[80%] uppercase">{gone ? 'No longer published at source' : 'The operator has this feed off air'}</p>
                {/* No ACCESS TERMINAL button: the page it would open is either
                    showing the same 'offline' banner we just read, or a 404. */}
              </div>
            ) : view === 'external' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-sm p-4 text-center">
                <ExternalLink className="w-6 h-6 mb-3 opacity-50" style={{ color: 'var(--gold-primary)' }} />
                <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--gold-primary)' }}>SECURE FEED ENCRYPTED</p>
                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-2 max-w-[80%] uppercase">This feed requires external clearance</p>
                <a 
                  href={externalFeedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 px-4 py-2 rounded text-[10px] font-mono font-bold tracking-widest transition-all hover:bg-white/10"
                  style={{ border: '1px solid var(--border-primary)', color: 'var(--gold-primary)' }}
                >
                  ACCESS TERMINAL
                </a>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mb-2 mx-auto"><Camera className="w-4 h-4 text-red-400" /></div>
                  <span className="text-[10px] font-mono text-red-400 tracking-widest block mb-1">FEED UNAVAILABLE</span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">Camera may be offline or restricted</span>
                  <button onClick={() => { setError(false); setRetryCount(c => c + 1); }} className="block mx-auto mt-3 px-3 py-1 text-[9px] font-mono text-[#7E57C2] border border-[#7E57C2]/30 rounded hover:bg-[#7E57C2]/10 transition-colors tracking-wider">
                    RETRY
                  </button>
                </div>
              </div>
            ) : streamType === 'hls' ? (
              <video
                ref={videoRef}
                className={`w-full h-full ${fullscreen ? 'object-contain' : 'object-cover'}`}
                autoPlay
                muted
                playsInline
              />
            ) : streamType === 'mjpeg' && camera.stream_url ? (
              <img
                src={camera.stream_url}
                alt={cameraAlt(camera)}
                className={`w-full h-full ${fullscreen ? 'object-contain' : 'object-cover'}`}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            ) : streamType === 'mp4' && camera.stream_url ? (
              <video
                src={camera.stream_url}
                className={`w-full h-full ${fullscreen ? 'object-contain' : 'object-cover'}`}
                autoPlay
                muted
                playsInline
                loop
              />
            ) : streamType === 'iframe' && streamUrl ? (
              <iframe
                src={streamUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={cameraAlt(camera)}
                className={`w-full h-full ${fullscreen ? 'object-contain' : 'object-cover'}`}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            ) : null}

            {/* Built-in analysis: counted on the reader's device, and what OI Assist sees. */}
            <CameraVision camera={camera} fit={fullscreen ? 'contain' : 'cover'} ready={!loading && !error && !externalOnly} />

            {/* Live indicator */}
            {!error && !loading && !externalOnly && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 border border-[var(--gold-primary)]/50 px-2 py-1 shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                <span className="text-[9px] font-mono text-white tracking-[0.2em]">
                  {watchLiveUrl || streamType === 'jpg' ? 'SNAPSHOT' : 'LIVE FEED'}
                </span>
              </div>
            )}

            {/* Live video is on the operator's own page; this is the way to it. */}
            {watchLiveUrl && !error && !externalOnly && (
              <a
                href={watchLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-mono font-bold tracking-widest transition-all hover:bg-[var(--gold-primary)]/25"
                style={{ borderColor: 'var(--gold-primary)', color: 'var(--gold-primary)', background: 'rgba(0,0,0,0.75)' }}
                title="Live video is hosted by the camera operator — opens their page"
              >
                <PlayCircle className="w-3 h-3" /> WATCH LIVE
              </a>
            )}

            {/* Tactical Crosshairs */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="w-[80%] h-[1px] bg-white/5 absolute top-1/2 -translate-y-1/2" />
              <div className="h-[80%] w-[1px] bg-white/5 absolute left-1/2 -translate-x-1/2" />
              <div className="w-16 h-16 border border-white/10 rounded-full" />
              <div className="w-1 h-1 bg-[var(--gold-primary)]/50 absolute" />
            </div>
          </div>

          {/* Advanced Tactical Footer */}
          <div className="bg-black border-t border-[var(--border-primary)] relative z-10">
            <div className="flex items-center justify-end px-3 py-1.5 border-b border-white/5">
              <div className="flex gap-3">
                {/* Share this camera: a deep link back to this exact camera
                    on the globe, carrying the visitor's personal share
                    code through /ref (lib/share — affiliate code when
                    signed in, this device's anonymous code otherwise).
                    Only for records that carry a catalogue id — without
                    one the link could not resolve, so the button is not
                    offered. */}
                {cameraShareId(camera) && (
                  <button
                    onClick={() => { setShareOpen(v => !v); setMapOpen(false); }}
                    aria-expanded={shareOpen}
                    className="flex items-center gap-1.5 px-2.5 py-1 border transition-colors text-[9px] font-mono font-bold tracking-widest"
                    style={shareOpen
                      ? { borderColor: 'var(--gold-primary)', background: 'var(--gold-primary)', color: '#000' }
                      : { borderColor: 'var(--gold-primary)', background: 'rgba(255,255,255,0.05)', color: 'var(--gold-primary)' }}
                    title="Show your share link for this camera"
                    aria-label="Share this camera"
                  >
                    <Share2 className="w-2.5 h-2.5" /> SHARE
                  </button>
                )}
                <button
                  onClick={() => { setMapOpen(v => !v); setShareOpen(false); }}
                  aria-expanded={mapOpen}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-[9px] font-mono text-[var(--cyan-primary)] tracking-widest"
                  title="Show where this camera is, on a map here"
                  aria-label="Show this camera on a map"
                >
                  <MapPin className="w-2.5 h-2.5" /> MAP TARGET
                </button>
              </div>
            </div>
            {/* Your link for this camera: the visitor's own share link
                (affiliate code when signed in, this device's anonymous
                code otherwise) — shown, not just copied blind — with a
                copy button and the platform share sheet beside it. A new
                visitor's link is anonymous until activated, so they get
                the activation path right here. */}
            {shareOpen && cameraShareId(camera) && (
              <div className="border-b border-white/5 px-3 py-2">
                <div className="text-[9px] font-mono tracking-widest text-[var(--text-muted)]">YOUR LINK FOR THIS CAMERA</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 min-w-0 truncate bg-white/5 border border-white/10 px-2 py-1.5 text-[10px] font-mono text-white" title={shareUrlText ?? undefined}>
                    {shareUrlText ?? 'Preparing your link…'}
                  </div>
                  <button
                    onClick={async () => {
                      if (!shareUrlText) return;
                      const outcome = await shareUrl(shareUrlText, cameraShareTitle(camera), '', {
                        clipboardWrite: t => navigator.clipboard.writeText(t),
                      }).catch(() => 'unavailable' as const);
                      if (outcome === 'copied') {
                        setShareState('copied');
                        setTimeout(() => setShareState('idle'), 2500);
                      }
                    }}
                    className="flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 border transition-colors text-[9px] font-mono font-bold tracking-widest"
                    style={{ borderColor: 'var(--gold-primary)', color: 'var(--gold-primary)', background: 'rgba(255,255,255,0.05)' }}
                    aria-label="Copy your share link"
                  >
                    {shareState === 'copied'
                      ? <><Check className="w-2.5 h-2.5" /> COPIED</>
                      : <><Copy className="w-2.5 h-2.5" /> COPY LINK</>}
                  </button>
                  <button
                    onClick={async () => {
                      const { outcome } = await shareEntity(
                        { kind: 'camera', id: cameraShareId(camera)! },
                        { label: cameraShareTitle(camera) },
                      );
                      if (outcome === 'copied') {
                        setShareState('copied');
                        setTimeout(() => setShareState('idle'), 2500);
                      }
                    }}
                    className="flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-[9px] font-mono tracking-widest text-white"
                    aria-label="Share this camera"
                  >
                    <Share2 className="w-2.5 h-2.5" /> SHARE…
                  </button>
                </div>
                {/* QR of the very same link shown above — scanning it
                    lands on this camera on the globe, share code and
                    all (lib/share/qr: the payload is the URL itself). */}
                {shareUrlText && (
                  <div className="mt-2.5 flex items-start gap-3">
                    <ShareWithQR url={shareUrlText} size={92} downloadName="worldeye-camera-qr.png" />
                    <p className="pt-1 text-[9px] font-mono leading-relaxed tracking-wide text-[var(--text-secondary)]">
                      SCAN WITH A PHONE CAMERA TO OPEN THIS CAMERA ON THE GLOBE — THE CODE CARRIES THE SAME LINK, YOUR SHARE CODE INCLUDED.
                    </p>
                  </div>
                )}
                {shareIsNew && shareUrlText && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
                    <span className="text-[9px] font-mono tracking-wide text-[var(--text-secondary)]">
                      NEW HERE? THIS LINK IS ANONYMOUS UNTIL YOU ACTIVATE IT — EARN RECURRING COMMISSIONS ON SIGNUPS THROUGH IT.
                    </span>
                    <a href="/affiliates" target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-2.5 py-1.5 text-[9px] font-mono font-bold tracking-widest text-black transition-opacity hover:opacity-85"
                      style={{ background: 'var(--gold-primary)' }}>
                      ACTIVATE AFFILIATE LINK
                    </a>
                  </div>
                )}
              </div>
            )}
            {/* Where this camera is — on a map here, not off-site. */}
            {mapOpen && Number.isFinite(camera.lat) && Number.isFinite(camera.lng) && (
              <CameraMiniMap lat={camera.lat} lng={camera.lng} name={camera.name} />
            )}
            {/* Timelapse (Pro): collect this snapshot camera's stills while
                watching. Inline views only — an external or offline camera
                shows no still here to collect. */}
            {!externalOnly && <TimelapseControl camera={camera} streamType={streamType} />}
            {/* Live recording (Pro): record the stream itself for stream
                cameras. Snapshot cameras render nothing here — the
                timelapse row above is their capture control; embeds and
                other unrecordable feeds get a plain-words note instead
                of a button that can't work. */}
            {!externalOnly && <LiveRecordControl camera={camera} streamType={streamType} streamUrl={streamUrl} />}
            {/* Animated data stream bar */}
            <div className="h-[2px] w-full bg-[var(--border-primary)] overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-[var(--gold-primary)] shadow-[0_0_8px_var(--gold-primary)] w-1/3 animate-pulse" style={{ animation: 'progress-glow-slide 2s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
