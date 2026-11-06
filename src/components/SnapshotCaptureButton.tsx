'use client';

/**
 * "Capture this moment" — the camera viewer's share-card control.
 *
 * Sits in the viewer's header controls beside the alert bell (same
 * pattern as CameraAlertButton: an icon button with a dropdown card).
 * One click composes a branded PNG from what the visitor is looking
 * at — the live frame when the browser is allowed to read it, a
 * designed card with the camera's real name/place/capture time when
 * it is not (lib/snapshot-card says why, and the panel says which
 * happened, in plain words). The panel then offers the three things
 * a captured moment is for: download the PNG, copy this camera's
 * link, or share — the file itself where the platform takes files
 * (iPhone share sheet), the link everywhere else.
 *
 * No account is needed and nothing is uploaded anywhere: composition
 * is entirely on-device, and capturing reads the already-playing
 * video or one same-origin frame fetch — it opens no new camera and
 * burns no extra camera opens.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';
import { cameraShareId } from '@/lib/camera-share';
import {
  composeSnapshotCard,
  copySnapshotLink,
  downloadSnapshotCard,
  grabViewableFrame,
  shareSnapshotCard,
  snapshotCardMeta,
  type SnapshotCardMeta,
} from '@/lib/snapshot-card';

const actionBtn =
  'flex-1 px-2 py-2 bg-white/5 border border-white/10 text-[9px] font-mono font-bold tracking-[0.15em] text-white hover:bg-white/10 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50';
const goldActionBtn =
  'flex-1 px-2 py-2 bg-[var(--gold-primary)] text-black text-[9px] font-mono font-bold tracking-[0.15em] hover:brightness-110 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50';

interface Card {
  blob: Blob;
  url: string;
  meta: SnapshotCardMeta;
  hasFrame: boolean;
}

export default function SnapshotCaptureButton({
  camera,
  getVideo,
  inline,
}: {
  camera: any | null;
  /** The viewer's playing <video> (HLS frames are taken from it). */
  getVideo: () => HTMLVideoElement | null;
  /** True when the viewer is showing this camera's picture inline. */
  inline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<Card | null>(null);

  const cameraId = cameraShareId(camera);

  const discardCard = () => {
    if (cardRef.current) URL.revokeObjectURL(cardRef.current.url);
    cardRef.current = null;
    setCard(null);
  };

  /* A camera switch starts clean — a card belongs to the camera it
     captured, never carried across to the next one. */
  useEffect(() => {
    setOpen(false);
    setBusy(false);
    setNotice(null);
    setCopied(false);
    discardCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  /* The viewer unmounts on close: release the card's object URL. */
  useEffect(() => () => {
    if (cardRef.current) URL.revokeObjectURL(cardRef.current.url);
  }, []);

  if (!cameraId || !inline) return null;

  const capture = async () => {
    setBusy(true);
    setNotice(null);
    setCopied(false);
    try {
      const meta = snapshotCardMeta(camera, new Date());
      const frame = await grabViewableFrame(
        { ...camera, stream_type: camera?.stream_type ?? null, feed_url: camera?.feed_url ?? null },
        getVideo(),
      );
      const { blob, hasFrame } = await composeSnapshotCard(meta, frame);
      discardCard();
      const next: Card = { blob, url: URL.createObjectURL(blob), meta, hasFrame };
      cardRef.current = next;
      setCard(next);
    } catch {
      setNotice('The card couldn’t be made just now — try again in a moment.');
    }
    setBusy(false);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !card && !busy) void capture();
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-label="Capture this moment as a share card"
        title="Capture this moment — a branded share card of this camera"
        className={`p-1.5 rounded-sm border transition-all ${
          open
            ? 'bg-[var(--gold-primary)]/20 border-[var(--gold-primary)]'
            : 'bg-white/5 border-white/10 hover:bg-[var(--gold-primary)]/20 hover:border-[var(--gold-primary)]'
        }`}
      >
        <Camera className={`w-3 h-3 ${open ? 'text-[var(--gold-primary)]' : 'text-[var(--text-secondary)]'}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[88vw] border border-[var(--border-primary)] bg-black/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[var(--gold-primary)]">
              CAPTURE THIS MOMENT
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close capture panel"
              className="p-1 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <X className="w-3 h-3 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {busy && (
              <p className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-white/50">
                <Loader2 className="w-3 h-3 animate-spin" /> MAKING YOUR CARD…
              </p>
            )}

            {notice && (
              <p className="text-[10px] font-mono leading-relaxed px-2.5 py-2 border text-amber-300 border-amber-300/30 bg-amber-400/10">
                {notice}
              </p>
            )}

            {card && !busy && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.url}
                  alt={`Share card for ${card.meta.name}`}
                  className="w-full border border-white/10"
                />
                <p className="text-[9px] font-mono text-white/45 leading-relaxed">
                  {card.hasFrame
                    ? 'That’s the live frame you were watching, with the moment it was captured.'
                    : 'This feed won’t let the browser copy its picture, so the card carries the camera’s name and place instead — no substitute image.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => downloadSnapshotCard(card.blob, card.meta)} className={actionBtn}>
                    <Download className="w-3 h-3" /> DOWNLOAD
                  </button>
                  <button
                    onClick={async () => {
                      if (await copySnapshotLink(card.meta)) {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }
                    }}
                    className={actionBtn}
                  >
                    {copied ? <><Check className="w-3 h-3" /> COPIED</> : <><Copy className="w-3 h-3" /> COPY LINK</>}
                  </button>
                  <button
                    onClick={async () => {
                      const outcome = await shareSnapshotCard(card.blob, card.meta);
                      if (outcome === 'copied') {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }
                    }}
                    className={goldActionBtn}
                  >
                    <Share2 className="w-3 h-3" /> SHARE
                  </button>
                </div>
                <button
                  onClick={() => void capture()}
                  className="w-full text-center text-[9px] font-mono tracking-[0.15em] text-white/40 hover:text-white/70 transition py-0.5"
                >
                  CAPTURE AGAIN
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
