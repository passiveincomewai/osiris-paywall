import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import SiteFooter from '@/components/SiteFooter';
import Link from 'next/link';
import {
  Bot, Camera, ChevronDown, HardDrive, KeyRound, Map as MapIcon, MessageCircle, Search, ShieldCheck, Sparkles, UserX, EyeOff,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'Privacy at WorldEye, in plain words: the map needs no account, what our own analytics record, the one advertising partner we measure with, and exactly which services hear from us when you use a feature.',
  alternates: { canonical: '/privacy' },
};

/**
 * Every statement on this page is drawn from the code in this repository, not
 * from a template; when a data flow changes, this page changes with it.
 *
 * Reviewed 2026-10-29 against: src/components/AnalyticsTracker + the
 * PageView model (prisma/schema.prisma), src/lib/analytics/visitor-id.ts,
 * src/components/MetaPixel.tsx + src/lib/meta-capi.ts, src/auth.ts and
 * src/lib/password-auth.ts (accounts, sessions, sign-in records),
 * src/app/api/checkout + the Stripe webhook (subscriptions),
 * src/lib/email.ts (Resend), src/app/api/contact, src/app/api/newsletter/*,
 * src/app/api/account/delete, src/app/api/geo, src/app/api/osint/*,
 * src/app/api/ai/*, src/app/api/oi/*, src/lib/oi/* (client, service, runs,
 * server-key, newsroom, markets), src/lib/sanctions.ts, src/lib/sherlock.ts,
 * src/lib/chainIntel.ts, src/components/OsirisMap.tsx (base map, satellite),
 * src/components/LiveAlerts.tsx, src/lib/live-clouds.ts, src/lib/donbot.ts,
 * src/components/oi/assist/voice.ts, the CCTV sources, and every
 * localStorage and sessionStorage key in src/.
 */

const REVIEWED = '29 October 2026';

/* ───────────── The pieces ───────────── */

function Pledge({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold-primary)]/10 text-[var(--gold-light)]">{icon}</span>
        <h3 className="text-[13px] font-semibold text-[var(--text-heading,var(--text-primary))]">{title}</h3>
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{children}</p>
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
      {intro && <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** One thing you might do, what it involves, and (a click away) exactly who hears from us. */
function Flow({ icon, title, summary, services, children }: {
  icon: ReactNode; title: string; summary: ReactNode; services?: { name: string; what: string }[]; children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-white/[0.02] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)]">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <div className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{summary}</div>
          {children}
          {services && services.length > 0 && (
            <details className="group mt-3">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-[12px] text-[var(--cyan-primary)] hover:underline [&::-webkit-details-marker]:hidden">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                Which services, exactly
              </summary>
              <ul className="mt-3 flex flex-col gap-2 border-l border-[var(--border-primary)] pl-4">
                {services.map(s => (
                  <li key={s.name} className="text-[12.5px] leading-relaxed">
                    <span className="font-mono text-[11.5px] text-[var(--text-primary)]">{s.name}</span>
                    <span className="text-[var(--text-muted)]"> · {s.what}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

const STORED: { what: string; detail: string }[] = [
  { what: 'A visitor ID (we_vid)', detail: 'A random ID generated in your browser and kept in local storage, so our analytics can tell a returning visitor from a new one. It is not your name or account, and clearing site data removes it.' },
  { what: 'Your AI key for OI', detail: 'Kept for this browser tab only, and gone when you close it, unless you tick “Remember on this device”.' },
  { what: 'Your OI settings and recent predictions', detail: 'Which provider and model you use, whether replies are read aloud, and a list of your last 25 predictions so you can reopen them.' },
  { what: 'Your OI Assist conversation', detail: 'For this tab only, so a reload does not lose it.' },
  { what: 'Areas you draw on the map', detail: 'So a refresh does not wipe your work.' },
  { what: 'How the map looks', detail: 'Your Style Studio colours and the last city the map opened on.' },
  { what: 'Your market watchlist and recent fingerprint searches', detail: 'So they are there next time. The search list can be cleared from the search panel.' },
];

const PROMISES: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <UserX className="h-4 w-4" />, title: 'No account needed to look', body: 'The map, cameras and live layers work without signing up. An account is optional — it exists so you can save cameras, subscribe, and sync your settings, and creating one is always your choice.' },
  { icon: <EyeOff className="h-4 w-4" />, title: 'We never sell your data', body: 'Your information is not sold or rented to anyone. We run our own first-party analytics (below) to see which pages and features get used; that record stays ours.' },
  { icon: <HardDrive className="h-4 w-4" />, title: 'Know what is stored where', body: 'Your preferences live in your browser. If you create an account, what you save — cameras, collections, recordings, alerts, settings — is stored on our servers with your account, and you can delete the account from your settings.' },
  { icon: <KeyRound className="h-4 w-4" />, title: 'Your AI key is yours', body: 'Your OI key is stored only in your browser. When a request uses it, it travels with that request so our server can pass it to your provider — it is used for that request and never stored or logged on our servers.' },
];

/* ───────────── The page ───────────── */

export default function PrivacyPage() {
  return (
    // docs-root releases the full-screen map's scroll lock (see globals.css), so the page scrolls.
    <main className="docs-root min-h-screen bg-[var(--bg-primary)] px-5 py-14 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-mono text-[11px] tracking-widest text-[var(--text-muted)] hover:text-[var(--cyan-primary)]">
          ← WORLDEYE
        </Link>

        <header className="mt-8">
          <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--gold-primary)]">PRIVACY</p>
          <h1 className="mt-2 text-3xl font-bold tracking-wide sm:text-4xl">Privacy, in plain words</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
            WorldEye is a window onto public information: flights, ships, cameras, news, markets and more, gathered onto
            one map. You can use it without an account; if you choose to create one, this page says exactly what we then
            hold, what our analytics record for every visitor, and, where a feature needs to ask another service for
            something, exactly which one.
          </p>
        </header>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {PROMISES.map(p => <Pledge key={p.title} icon={p.icon} title={p.title}>{p.body}</Pledge>)}
        </div>

        <Section id="short" title="The short version">
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--text-muted)]">
            {[
              'Most of what you see comes from public sources. To show it, our server asks those sources, much as your browser would.',
              'When you look something up, the question goes to the service that holds the answer, and only for that lookup.',
              'Our own analytics record each page visit — the page, the session and visitor IDs described above, the referring site, any campaign (UTM) tags on the link you arrived with, a coarse device type (mobile, tablet, desktop), how long the page was visible, and feature events such as reaching the globe. They do not record passwords, payment details, or the content of your lookups.',
              'Your preferences and history live in your browser. If you create an account, the things you save are stored with your account on our servers instead — the account section below lists them.',
              'Features that use AI run either on the key and provider you choose, passed straight through per request, or — when you are signed in — on our own OpenAI key within usage limits.',
              'One advertising partner measures our ads: Meta’s pixel runs on our pages and reports page views, and sign-ups, checkouts, trials and purchases, to Meta (see “Measuring our advertising” below). We do not sell data to anyone.',
              'The site is hosted on Vercel, our database is managed Postgres (Neon), and our email is sent through Resend. Those providers process the data described here on our behalf.',
            ].map(t => (
              <li key={t} className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--gold-light)]" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="device" title="What stays on your device"
          intro="These are kept in your browser’s own storage on this device. We never receive them unless a feature you use needs one, like your AI key for an OI request. Clearing this site’s data in your browser settings removes them all.">
          <div className="divide-y divide-[var(--border-primary)]/60 rounded-xl border border-[var(--border-primary)]">
            {STORED.map(s => (
              <div key={s.what} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6">
                <span className="text-[13px] font-medium sm:w-56 sm:flex-shrink-0">{s.what}</span>
                <span className="text-[13px] leading-relaxed text-[var(--text-muted)]">{s.detail}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="services" title="When we reach out to other services"
          intro="WorldEye does not keep a database of intelligence of its own: it asks public services in real time. Here is what that involves, by what you are doing. Each service treats what it receives under its own privacy policy.">
          <div className="flex flex-col gap-3">
            <Flow icon={<MapIcon className="h-4 w-4" />} title="Opening the map"
              summary={<>
                So the map can open over your part of the world, our server asks an IP location service roughly where your
                connection is. It is a city-level guess, it is not stored, and if it cannot tell, the map opens on a
                well-covered city instead. The map itself (its tiles, and the satellite view when you switch to it)
                loads from the services that draw it, as with any website that shows a map. The site’s typefaces are
                served from our own hosting, not from a font service.
              </>}
              services={[
                { name: 'ipapi.co, then freeipapi.com, then ip-api.com', what: 'your connection’s IP address, asked from our server, to place the map' },
                { name: 'CARTO (basemaps.cartocdn.com)', what: 'the map tiles for the part of the world in view' },
                { name: 'Esri (server.arcgisonline.com)', what: 'satellite imagery, only when you switch to the satellite view' },
                { name: 'Esri Wayback (wayback.maptiles.arcgis.com, config.maptiles.arcgis.com)', what: 'dated historical satellite imagery and its release catalogue, only when you use the satellite view’s time slider' },
              ]} />

            <Flow icon={<Search className="h-4 w-4" />} title="Looking something up"
              summary={<>
                The RECON tools answer by asking the public service that holds the answer, from our server. That service
                sees the email, domain, address or name you looked up, but not who you are. Two checks never leave our
                server at all: <span className="text-[var(--text-primary)]">phone numbers</span> are read with a library
                that runs here, and <span className="text-[var(--text-primary)]">sanctions searches</span> run against a
                copy of the published list we keep.
              </>}
              services={[
                { name: 'XposedOrNot', what: 'an email address, for breach checks' },
                { name: 'Hudson Rock', what: 'an email or domain, for infostealer checks' },
                { name: 'Shodan InternetDB, RIPE, RDAP, Google Public DNS, crt.sh', what: 'a host, address or domain, for infrastructure, ownership, DNS and certificate lookups' },
                { name: 'ip-api.com, Tor Project, AlienVault OTX', what: 'an IP address or indicator, for location and threat checks' },
                { name: 'CIRCL and MITRE', what: 'a CVE number, for vulnerability details' },
                { name: 'GitHub, and a dozen public profile sites', what: 'a username, to see where it is in use' },
                { name: 'maclookup.app', what: 'a hardware (MAC) address, for its maker' },
                { name: 'mempool.space, Blockscout, the public Solana network, CoinGecko', what: 'a wallet address, and prices to value it' },
              ]} />

            <Flow icon={<Camera className="h-4 w-4" />} title="Watching cameras and live alerts"
              summary={<>
                Camera pictures and streams come straight from whoever runs each camera (a road authority, a harbour, a
                city) or from the video service it uses, such as YouTube, which may set its own cookies when a video plays.
                A few alerts carry photos that load from Telegram when you open them, and the Live Clouds layer loads its
                imagery from NOAA while it is switched on. In each case the service sees an ordinary request from your
                browser, as for any picture on the web.
              </>} />

            <Flow icon={<Sparkles className="h-4 w-4" />} title="Using OI — your key, or ours"
              summary={<>
                OI can run two ways. On <span className="text-[var(--text-primary)]">your own key</span>, your browser
                keeps the key and sends it with each request; our server passes the request to the provider you chose —
                your question and any data you add for a prediction, or the conversation and what is on the map for
                Assist — and the provider sees our server’s address, not yours. The key itself is used for that request
                and never stored. When you are <span className="text-[var(--text-primary)]">signed in</span>, OI can
                instead run on WorldEye’s own OpenAI key (“WorldEye AI”) within hourly usage limits; then your request
                goes to OpenAI on our account.
              </>}
              services={[
                { name: 'The provider you choose', what: 'OpenAI, Anthropic, Google, OpenRouter, Groq, DeepSeek, xAI, Mistral or Alibaba Cloud: your key and your request' },
                { name: 'News publishers’ feeds, GDELT, Wikipedia', what: 'a few keywords from your question, to find the reporting and background a prediction reads; the articles found are then read from their publishers' },
                { name: 'Yahoo Finance', what: 'the ticker of a price your question is about, for its price history and its news' },
                { name: 'Polymarket and Manifold', what: 'a few keywords from your question, to find what prediction markets price it at; and, for the suggestions on the ask form, nothing about you at all' },
                { name: 'Photon and Nominatim (OpenStreetMap)', what: 'a place name, when you search for one or OI looks one up' },
              ]}>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
                A prediction has its own link so it can be shared: anyone you give the link to can open it, and it is held
                in our server’s memory for up to three hours after it finishes. The microphone in OI Assist uses your browser’s own
                speech recognition (in Chrome and Edge, a Google or Microsoft service); we only ever receive the words.
              </p>
            </Flow>

            <Flow icon={<Bot className="h-4 w-4" />} title="AI briefings and token scans"
              summary={<>
                The briefing, analysis and overview buttons send the feed headlines they summarise to Google Gemini, on this
                site’s own key. A DonBot token scan opens DigitalDon’s scanner in a sealed frame, which receives the token
                you scan.
              </>} />
          </div>
        </Section>

        <Section id="accounts" title="Accounts, subscriptions and email"
          intro="Everything in this section applies only if you choose to create an account, subscribe to a plan or to email alerts, join the newsletter, or write to us. Browsing the map needs none of it.">
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--text-muted)]">
            <li><span className="text-[var(--text-primary)]">Your account.</span> Your email address and, if you sign up with a password, a bcrypt-hashed version of it (we never store the password itself). If you continue with Google, Google confirms your identity and we receive your email address from Google. Where an emailed sign-in link is offered, the link is sent through Resend and signs you in without a password. Account sessions use signed, httpOnly cookies.</li>
            <li><span className="text-[var(--text-primary)]">Sign-in security records.</span> Each sign-in records the device, a hashed form of the IP address (never the address itself), and an approximate location, so you can recognise your own sessions and we can spot account misuse.</li>
            <li><span className="text-[var(--text-primary)]">What you save.</span> Saved cameras and views, collections, camera alerts you set, clips in your recording library, and your account preferences are stored with your account so they are there when you return. Signed-in skiers can also follow resorts, log pass days in the pass-value tracker, and set trip reminders (resort, trip dates and an email address) — we email two planning reminders before the trip, and each carries an unsubscribe link.</li>
            <li><span className="text-[var(--text-primary)]">Subscriptions.</span> Checkout runs in Stripe’s embedded form on our pages: your card details go to Stripe, never to our servers. We store your subscription status, plan and billing period, and Stripe’s customer reference. A promotional code entered at checkout is applied by Stripe.</li>
            <li><span className="text-[var(--text-primary)]">Email.</span> Verification, password-reset, billing and (if you subscribe) newsletter and product emails are sent through Resend from WorldEye. Every marketing email carries an unsubscribe link, and unsubscribing takes effect immediately.</li>
            <li><span className="text-[var(--text-primary)]">Messages you send us.</span> Contact-form messages are stored with your name, email and message so we can reply. If you join the affiliate programme, we also keep your referral, commission and payout records, including the payout details you provide (for example a Venmo handle), as the programme requires. If you arrive through a member’s referral link, or tell us how you found WorldEye, we save that on your account.</li>
            <li><span className="text-[var(--text-primary)]">Alert subscriptions without an account.</span> You can subscribe an email address to transit service alerts without creating an account. We store the address and the route you picked so we can send those alert digests, and every alert email carries an unsubscribe link that stops them.</li>
            <li><span className="text-[var(--text-primary)]">Deleting your account.</span> You can schedule deletion from your account settings. It takes effect on the date shown when you schedule it, you can cancel any time before then, and deletion removes your account and the data stored with it.</li>
          </ul>
        </Section>

        <Section id="advertising" title="Measuring our advertising"
          intro="We run ads for WorldEye on Meta’s platforms (Facebook and Instagram), and we measure them with Meta’s tools. This is the one place advertising technology touches this site, so here it is in the open:">
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--text-muted)]">
            <li><span className="text-[var(--text-primary)]">The Meta pixel</span> loads on our pages and reports page views to Meta, including on repeat visits from the same browser.</li>
            <li><span className="text-[var(--text-primary)]">Sign-up and purchase events</span> — creating an account, starting checkout, starting a trial and completing a purchase — are also reported to Meta, from the browser and from our server (Meta’s Conversions API), so we can tell which ads led to them. Event reports include the event type, time and value; purchase events are keyed to the Stripe transaction.</li>
            <li>Meta processes what it receives under its own privacy policy. We do not sell personal data to Meta or anyone else, and no other advertising network runs on this site.</li>
          </ul>
        </Section>

        <Section id="good-to-know" title="Good to know">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { t: 'A lookup is a question to someone else', b: 'The service that answers a lookup sees what was asked. If what you are researching is sensitive, keep that in mind before you search.' },
              { t: 'Shared links are open', b: 'Anyone with a prediction’s link can open it while it is kept. Share it with the people you mean to.' },
              { t: 'AI is a starting point', b: 'Briefings and predictions are written by language models. OI shows its sources so you can check them, and you should.' },
              { t: 'Scan only what you may', b: 'Scans are rate limited and kept away from private networks, but whether you may scan a system is between you and its owner.' },
            ].map(x => (
              <div key={x.t} className="rounded-xl border border-[var(--border-primary)] bg-white/[0.02] p-4">
                <h3 className="text-[13px] font-semibold">{x.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{x.b}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="choices" title="Your choices">
          <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-[var(--text-muted)]">
            <li><span className="text-[var(--text-primary)]">Clear everything on this device</span> by clearing this site’s data in your browser settings — this removes the visitor ID, your settings and any locally kept AI key.</li>
            <li><span className="text-[var(--text-primary)]">Delete your account</span> from your account settings: deletion is scheduled for the date shown, can be cancelled before then, and removes your account and the data stored with it.</li>
            <li><span className="text-[var(--text-primary)]">Stop marketing email</span> with the unsubscribe link in any email we send; account and billing emails (receipts, resets) still arrive while you have an account, because they are part of the service.</li>
            <li><span className="text-[var(--text-primary)]">Keep your AI key to one session</span> by leaving “Remember on this device” unticked; it is then forgotten when the tab closes.</li>
            <li><span className="text-[var(--text-primary)]">Use only what you need</span>: map layers, cameras and AI features reach out only when you switch them on or use them.</li>
            <li><span className="text-[var(--text-primary)]">Run your own copy</span>: the platform began as an open-source project, so you can host it yourself and decide who operates it.</li>
          </ul>
        </Section>

        <Section id="contact" title="Questions?">
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            If something here is unclear, or you think we have missed something, tell us and we will put it right.
            You can email us at{' '}
            <a href="mailto:contact@worldeye.app" className="text-[var(--text-primary)] hover:underline">contact@worldeye.app</a>{' '}
            or write to WorldEye, 555 E 3200 N, North Ogden, UT 84414, USA.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <a href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-primary)] px-3.5 py-2 text-[13px] hover:border-[var(--cyan-primary)] hover:text-[var(--cyan-primary)]">
              <MessageCircle className="h-4 w-4" /> Contact us
            </a>
          </div>
        </Section>

        <p className="mt-14 border-t border-[var(--border-primary)]/60 pt-5 text-[12px] text-[var(--text-muted)]">
          Last checked against the code on {REVIEWED}. When a feature changes what it shares, this page changes with it.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
