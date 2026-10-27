# WorldEye Ambient Relay — stream cleared cameras to your YouTube channel

The relay is a small Node program that turns WorldEye Ambient into a
24/7 show on **your own YouTube channel**: it pulls live cameras that
WorldEye is cleared to redistribute, stamps each scene with a
“Live on WorldEye · worldeye.app/ambient” overlay and the camera's
name and place, cycles scenes on an interval, and restarts dead
feeds automatically.

It runs on **your always-on machine** — a home server, mini PC or
spare laptop. It cannot run on WorldEye's web hosting: streaming is
a continuous upload from wherever the relay lives. If the machine
sleeps, the stream stops.

## Before you start

1. **Ambient access.** Stream to YouTube needs a WorldEye Ambient
   subscription ($4.99/mo, 10-day free trial) or any Pro/VIP plan.
2. **A YouTube channel** with live streaming enabled (YouTube asks
   for a one-time verification and up to 24 h before the first
   stream).
3. **Your stream key**: YouTube Studio → *Create → Go live* →
   Stream settings → copy the **stream key**. Treat it like a
   password.
4. **Save the key + get your relay token** at
   [worldeye.app/ambient/stream](https://worldeye.app/ambient/stream).
   The token is shown once — if you lose it, rotate it there.
5. **ffmpeg** on the relay machine, with libx264 and drawtext
   (any normal ffmpeg install).

## Run it

```bash
cd tools/ambient-relay
AMBIENT_RELAY_TOKEN=<your token> npm start
```

Keep it alive with whatever you already use — pm2
(`pm2 start relay.mjs --name ambient-relay`), a systemd unit, or a
Docker container. On boot the relay fetches your playlist (your key
+ the cleared cameras) from WorldEye; it re-fetches after every
full rotation, so a rotated key or a fresh shuffle is picked up
without a restart.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `AMBIENT_RELAY_TOKEN` | — (required) | Your relay token from /ambient/stream |
| `WORLDEYE_URL` | `https://worldeye.app` | WorldEye base URL |
| `AMBIENT_SCENE_SECONDS` | `600` | Seconds per camera before rotating |
| `AMBIENT_MAXRATE_KBPS` | `2500` | Video bitrate ceiling (720p30 output) |

## How it behaves

- **Scenes**: one ffmpeg per scene, 1280×720, silent audio track
  (camera audio is never restreamed — many cameras have none, and
  silence can't carry someone else's copyrighted audio).
- **Dead feeds**: if a camera drops, ffmpeg exits and the relay
  moves to the next scene; the show stays up.
- **Eligibility**: the playlist contains only cameras whose sources
  WorldEye's rights registry clears for redistribution (public
  agencies and registry-cleared feeds). Windy and unreviewed sources
  are never included — watching on worldeye.app and restreaming to a
  public channel are different rights, and the playlist respects
  that.
- **Your key stays yours**: it is stored on WorldEye encrypted, is
  sent only to this relay over HTTPS against your token, and is
  used only as the RTMP destination for your channel.

## Troubleshooting

- `playlist fetch failed: HTTP 401` — wrong or rotated token; copy
  the current one from /ambient/stream.
- `ffmpeg was not found` — install ffmpeg and check `ffmpeg -version`.
- Stream shows a black frame for one scene — that camera is up but
  dark (night, an indoor view). The rotation moves on by itself.
