/**
 * One-video-at-a-time coordination for the landing islands.
 *
 * Each island also pauses its own video when it scrolls off-screen; this
 * registry is the belt-and-braces layer for the moments two islands are
 * partially visible at once (a short viewport can show the tail of the
 * camera gallery and the head of the tracking stage together). Claiming
 * playback pauses whichever video held it before.
 */
let current: HTMLVideoElement | null = null;

export function claimPlayback(video: HTMLVideoElement) {
  if (current && current !== video) {
    try {
      current.pause();
    } catch {
      /* element already gone */
    }
  }
  current = video;
}

export function releasePlayback(video: HTMLVideoElement) {
  if (current === video) current = null;
}
