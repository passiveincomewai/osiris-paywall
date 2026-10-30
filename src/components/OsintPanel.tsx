'use client';

import { useState, useCallback, useEffect, memo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LocateFixed,
  Search, Radar, Globe, Shield, FileText, Radio, Bluetooth,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Server,
  Wifi, Lock, MapPin, Bug, Code, Layers, Network, Fingerprint,
  CheckCircle, XCircle, Clock, ExternalLink, Crosshair, Camera,
  Maximize2, Minimize2, X, Gavel, Bitcoin, Phone, Terminal, ShieldAlert, User,
  Crown, Database, Users, Zap, AtSign, Clapperboard
} from 'lucide-react';
import { ipToNumber, numberToIp, calculateSubnetStart, classifyDevice, assessRisk, batchFetch, ShodanInternetDBResponse, SweepDevice } from '@/lib/osint-utils';
import ChainBrief from '@/components/ChainBrief';
import FingerprintSearch, { useFingerprintSearch } from '@/components/FingerprintSearch';
import DonBotScan from '@/components/DonBotScan';
import DigitalDonMark from '@/components/DigitalDonMark';
import WorldRemote from '@/components/WorldRemote';

/**
 * Tool categories — presentation only (owner's RECON board redesign,
 * 2026-10-26). The five headings follow the reference board; every tool
 * is filed under the heading it honestly belongs to:
 *  · the old NETWORK & HOST and DOMAIN & WEB groups merge into
 *    "Domain & Network Intel" (the board's first row);
 *  · IP SWEEP files under "Geoint & Location Analysis" alongside the
 *    Self Track action — both are the panel's location/network-mapping
 *    actions (lookup targets are also geolocated from here);
 *  · VULN SWEEP files under "Threat Intelligence" — it is a CVE
 *    exposure check, not a network utility.
 * WORLD REMOTE moved here from its own mobile bottom-nav tab + desktop
 * rail popover (owner merge, 2026-10-26): it is a device sweep whose
 * GPS-tagged captures are placed on the globe, so it files under Geoint
 * beside IP SWEEP and Self Track — the panel's other two
 * put-things-on-the-map actions.
 * No tool was added or dropped by the redesign: TABS below is the full
 * inventory, and a category can never invent a tool the panel doesn't
 * have.
 */
const GROUPS = [
  { id: 'domain', label: 'Domain & Network Intel', hint: 'IPs, ports, DNS, certificates, routing', icon: Database },
  { id: 'identity', label: 'Identity & Profile Recon', hint: 'People, handles, accounts', icon: Users },
  { id: 'geoint', label: 'Geoint & Location Analysis', hint: 'Subnet mapping, Bluetooth devices, photo locations and your own IP location', icon: MapPin },
  { id: 'threat', label: 'Threat Intelligence', hint: 'Reputation, breaches and CVE exposure', icon: ShieldAlert },
  { id: 'chain', label: 'Blockchain Intelligence', hint: 'Wallets, tokens and on-chain incidents', icon: Bitcoin },
] as const;

type GroupId = (typeof GROUPS)[number]['id'];

interface ToolDef {
  id: string;
  label: string;
  /** Two-line tile label for the board grid ('\n' separated). */
  tile?: string;
  icon: any;
  placeholder: string;
  color: string;
  group: GroupId;
  /** Shown under the label in the expanded view. */
  blurb: string;
}

/**
 * Target-type mode chips under the scan bar (the board's bottom row).
 * Each chip is a shortcut onto the REAL tool for that input type — the
 * same selectTool path a tile click takes — never a parallel flow.
 */
const MODE_CHIPS = [
  { id: 'quick', label: 'QUICK SCAN', icon: Zap },
  { id: 'domain', label: 'DOMAIN', icon: Globe },
  { id: 'ip', label: 'IP', icon: MapPin },
  { id: 'username', label: 'USERNAME', icon: User },
  { id: 'email', label: 'EMAIL', icon: AtSign },
  { id: 'phone', label: 'PHONE', icon: Phone },
] as const;

type ModeChipId = (typeof MODE_CHIPS)[number]['id'];

/** Which mode chip a tool belongs to — derived from state, never stored.
 *  Tools whose input is none of the six types light no chip. */
function modeForTool(tab: string, scanType: string): ModeChipId | null {
  switch (tab) {
    case 'scanner': return scanType === 'quick' ? 'quick' : 'ip';
    case 'shodan': case 'bgp': return 'ip';
    case 'dns': case 'whois': case 'certs': case 'ssl':
    case 'subdomains': case 'headers': case 'tech': return 'domain';
    case 'username': case 'github': case 'fingerprint': return 'username';
    case 'leaks': return 'email';
    case 'phone': return 'phone';
    default: return null;
  }
}

/* ── RECON board skin (owner's reference design, 2026-10-26) ─────────────
   Deep-navy sci-fi board: neon-blue frame glow, glowing icon tiles,
   gold premium pill. Pure presentation — every handler, state field
   and API call in this file is unchanged from the previous skin.
   Per-tool accent colours stay inline (they come from TABS); these
   classes carry only the shared board chrome. */
const RECON_STYLES = `
  .we-recon-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 13px; border-bottom: 1px solid rgba(56,150,255,0.28); background: linear-gradient(180deg, rgba(16,64,128,0.38), rgba(4,16,31,0.05)); flex-shrink: 0; }
  .we-recon-medallion { position: relative; width: 42px; height: 42px; flex-shrink: 0; border-radius: 9999px; border: 2px solid rgba(56,189,248,0.85); box-shadow: 0 0 14px rgba(56,189,248,0.5), inset 0 0 10px rgba(56,189,248,0.35); display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 42%, rgba(56,189,248,0.30), rgba(3,13,26,0.9) 72%); }
  .we-recon-medallion::before { content: ''; position: absolute; left: 50%; top: -7px; width: 2px; height: calc(100% + 14px); transform: translateX(-50%); background: rgba(56,189,248,0.45); }
  .we-recon-medallion::after { content: ''; position: absolute; top: 50%; left: -7px; height: 2px; width: calc(100% + 14px); transform: translateY(-50%); background: rgba(56,189,248,0.45); }
  .we-recon-title { font-size: 19px; font-weight: 800; letter-spacing: 0.10em; color: #EAF6FF; text-shadow: 0 0 14px rgba(56,189,248,0.65); line-height: 1; }
  .we-recon-premium { display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 8px; border-radius: 999px; border: 1px solid rgba(255,196,0,0.75); background: rgba(255,196,0,0.10); color: #FFC400; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; box-shadow: 0 0 10px rgba(255,196,0,0.22); white-space: nowrap; }
  .we-recon-subtitle { font-size: 9.5px; line-height: 1.35; color: rgba(178,214,255,0.78); }
  .we-recon-tile { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 6px; padding: 9px 3px 8px; border-radius: 12px; border: 1px solid rgba(56,150,255,0.28); background: linear-gradient(180deg, rgba(21,74,140,0.30), rgba(6,24,48,0.55)); cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease; width: 100%; }
  .we-recon-tile:hover { border-color: rgba(125,211,252,0.75); box-shadow: 0 0 14px rgba(56,189,248,0.30); }
  .we-recon-tile-icon { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; border: 1px solid; flex-shrink: 0; }
  .we-recon-tile-label { font-size: 9px; font-weight: 600; line-height: 1.3; text-align: center; white-space: pre-line; letter-spacing: 0.02em; }
  .we-recon-input { background: rgba(3,13,26,0.75); border: 1px solid rgba(56,150,255,0.35); border-radius: 10px; color: #EAF6FF; }
  .we-recon-input:focus { border-color: rgba(56,189,248,0.8); box-shadow: 0 0 10px rgba(56,189,248,0.25); }
  .we-recon-scanbar { display: flex; align-items: center; gap: 6px; padding: 5px 5px 5px 8px; border-radius: 14px; border: 1px solid rgba(56,189,248,0.55); background: rgba(3,13,26,0.85); box-shadow: 0 0 18px rgba(0,140,255,0.22), inset 0 0 14px rgba(0,110,255,0.08); }
  .we-recon-scanbtn { background: linear-gradient(180deg, #38BDF8, #0284C7); color: #fff; font-weight: 800; font-size: 11.5px; letter-spacing: 0.12em; border-radius: 10px; padding: 8px 16px; box-shadow: 0 0 16px rgba(56,189,248,0.55); transition: filter 0.15s ease, opacity 0.15s ease; }
  .we-recon-scanbtn:hover:not(:disabled) { filter: brightness(1.12); }
  .we-recon-scanbtn:disabled { opacity: 0.35; box-shadow: none; }
  .we-recon-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border-radius: 9px; border: 1px solid rgba(56,150,255,0.30); background: rgba(10,40,80,0.35); color: rgba(190,220,255,0.78); font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; transition: all 0.15s ease; }
  .we-recon-chip:hover { border-color: rgba(125,211,252,0.7); color: #BAE6FD; }
  .we-recon-chip[data-active="true"] { border-color: rgba(56,189,248,0.9); color: #7DD3FC; background: rgba(56,189,248,0.14); box-shadow: 0 0 12px rgba(56,189,248,0.30); }
  .we-recon-card { background: rgba(3,13,26,0.66); border: 1px solid rgba(56,150,255,0.25); border-radius: 12px; }
`;

/** Neon board frame with corner rivets — shared by the compact panel
 *  and the expanded view so both wear the same skin. */
const RECON_FRAME_STYLE: CSSProperties = {
  background: [
    'radial-gradient(circle at 11px 11px, rgba(165,220,255,0.85) 1.4px, transparent 2.8px)',
    'radial-gradient(circle at calc(100% - 11px) 11px, rgba(165,220,255,0.85) 1.4px, transparent 2.8px)',
    'radial-gradient(circle at 11px calc(100% - 11px), rgba(165,220,255,0.85) 1.4px, transparent 2.8px)',
    'radial-gradient(circle at calc(100% - 11px) calc(100% - 11px), rgba(165,220,255,0.85) 1.4px, transparent 2.8px)',
    'linear-gradient(165deg, #081c38 0%, #04101f 58%, #030b18 100%)',
  ].join(', '),
  border: '1px solid rgba(56,150,255,0.5)',
  boxShadow: '0 0 28px rgba(0,140,255,0.28), inset 0 0 36px rgba(0,110,255,0.07)',
  borderRadius: 16,
};

const TABS: ToolDef[] = [
  { id: 'scanner', label: 'PORT SCAN', icon: Radar, placeholder: 'IP or hostname', color: '#00E5FF', group: 'domain', tile: 'Port\nScan', blurb: 'Open ports and running services' },
  { id: 'vuln', label: 'VULN SWEEP', icon: Bug, placeholder: 'IP or hostname', color: '#FF3D3D', group: 'threat', tile: 'Vuln\nSweep', blurb: 'Known CVEs affecting the host' },
  { id: 'shodan', label: 'SHODAN IOT', icon: Network, placeholder: 'IP address', color: '#FF3D3D', group: 'domain', tile: 'Shodan\nIoT', blurb: 'Internet-exposed device record' },
  { id: 'bgp', label: 'BGP ROUTE', icon: Globe, placeholder: 'IP or ASN', color: '#00E5FF', group: 'domain', tile: 'BGP\nRoute', blurb: 'Autonomous system and prefixes' },
  { id: 'mac', label: 'MAC ADDR', icon: Fingerprint, placeholder: 'MAC address', color: '#FFD700', group: 'domain', tile: 'MAC\nAddress', blurb: 'Hardware vendor lookup' },
  { id: 'sweep', label: 'IP SWEEP', icon: Crosshair, placeholder: 'Enter IP address (e.g. 8.8.8.8)', color: '#FF3D3D', group: 'geoint', tile: 'IP\nSweep', blurb: 'Scan an entire subnet' },
  { id: 'remote', label: 'WORLD REMOTE', icon: Bluetooth, placeholder: 'Bluetooth devices around you', color: '#00E5FF', group: 'geoint', tile: 'World\nRemote', blurb: 'Bluetooth devices around you, placed on the globe' },
  { id: 'photogeo', label: 'PHOTO GEO', icon: Camera, placeholder: 'Upload a photo on the tool page', color: '#34D399', group: 'geoint', tile: 'Photo\nGeo', blurb: 'Where was this photo taken?' },
  { id: 'sensing', label: 'WIFI SENSING', icon: Wifi, placeholder: 'Open the sensing tool page', color: '#38BDF8', group: 'geoint', tile: 'WiFi\nSensing', blurb: 'Sense motion in a room with WiFi' },
  { id: 'director', label: 'CINEMATIC DIRECTOR', icon: Clapperboard, placeholder: 'Open the Cinematic Director', color: '#D4AF37', group: 'geoint', tile: 'Cinematic\nDirector', blurb: 'Camera scenes & globe recording' },

  { id: 'dns', label: 'DNS', icon: Server, placeholder: 'Domain name', color: '#448AFF', group: 'domain', tile: 'DNS\nLookup', blurb: 'All record types' },
  { id: 'whois', label: 'WHOIS', icon: FileText, placeholder: 'Domain name', color: '#FFD700', group: 'domain', tile: 'WHOIS\nLookup', blurb: 'Registrar and ownership' },
  { id: 'certs', label: 'CERTS', icon: Lock, placeholder: 'Domain name', color: '#E040FB', group: 'domain', tile: 'Certificates\nInfo', blurb: 'Certificate transparency log' },
  { id: 'ssl', label: 'SSL/TLS', icon: Shield, placeholder: 'Domain name', color: '#76FF03', group: 'domain', tile: 'SSL / TLS\nAnalysis', blurb: 'Cipher and certificate health' },
  { id: 'subdomains', label: 'SUBDOMAINS', icon: Layers, placeholder: 'Domain to enumerate', color: '#00BCD4', group: 'domain', tile: 'Subdomains\nFinder', blurb: 'Enumerate attack surface' },
  { id: 'headers', label: 'HEADERS', icon: Code, placeholder: 'URL to inspect', color: '#87CEEB', group: 'domain', tile: 'Headers\nInspector', blurb: 'Security headers audit' },
  { id: 'tech', label: 'TECH DETECT', icon: Code, placeholder: 'URL to fingerprint', color: '#9C27B0', group: 'domain', tile: 'Technology\nDetect', blurb: 'Frameworks and stack' },

  { id: 'username', label: 'USERNAME', icon: User, placeholder: 'Username / handle to hunt', color: '#00E676', group: 'identity', tile: 'Username\nSearch', blurb: 'Hunt a handle across platforms' },
  { id: 'github', label: 'GITHUB RECON', icon: Terminal, placeholder: 'GitHub username', color: '#87CEEB', group: 'identity', tile: 'GitHub\nRecon', blurb: 'Profile, repos and contacts' },
  { id: 'phone', label: 'PHONE INTEL', icon: Phone, placeholder: 'Phone number (e.g. +1...)', color: '#FF9500', group: 'identity', tile: 'Phone\nIntelligence', blurb: 'Carrier, region and line type' },
  { id: 'fingerprint', label: 'FINGERPRINT', icon: Fingerprint, placeholder: 'Username, email or phone', color: '#3B82F6', group: 'identity', tile: 'Fingerprint\nSearch', blurb: 'Public profile search, streamed live' },

  { id: 'threats', label: 'THREATS', icon: AlertTriangle, placeholder: 'IP, domain, or hash', color: '#FF9500', group: 'threat', tile: 'Threat\nLookup', blurb: 'Reputation across feeds' },
  { id: 'leaks', label: 'DATA LEAKS', icon: ShieldAlert, placeholder: 'Email address', color: '#E040FB', group: 'threat', tile: 'Data Breach\nSearch', blurb: 'Breach exposure for an address' },

  { id: 'crypto', label: 'CHAIN INTEL', icon: Bitcoin, placeholder: 'BTC, ETH or SOL wallet address', color: '#F7931A', group: 'chain', tile: 'Chain\nIntel', blurb: 'Wallet forensics and daily brief' },
  // DigitalDon's own mark, kept monochrome by their brand rule.
  { id: 'donbot', label: 'DONBOT', icon: DigitalDonMark, placeholder: 'Ticker, name or contract address', color: '#E8E6E0', group: 'chain', tile: 'DonBot', blurb: 'Token signal and holder clusters' },
];

interface OsintPanelProps { isOpen?: boolean; onClose?: () => void; isMobile?: boolean; onSweepVisualize?: (data: any) => void; onScanGeolocate?: (target: string, data: any) => void; onPlaceDevicesOnMap?: (devs: { id: string; name: string; lat: number; lng: number; type: string; color: string }[]) => void; /** Opens the Cinematic Director panel on the globe (Item 2, 2026-10-29: the Director entry point moved from a floating globe pill into this RECON panel). */ onOpenDirector?: () => void; }

function OsintPanelInner({ isMobile, onClose, onSweepVisualize, onScanGeolocate, onPlaceDevicesOnMap, onOpenDirector }: OsintPanelProps) {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanType, setScanType] = useState('quick');
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<{tab:string;query:string;time:string}[]>([]);
  const [sweepResult, setSweepResult] = useState<any>(null);
  const [sweepProgress, setSweepProgress] = useState<{ current: number; total: number } | null>(null);
  const [sweepCidr, setSweepCidr] = useState(24);
  const [cveCache, setCveCache] = useState<Record<string, any>>({});
  // CHAIN INTEL carries two views: the daily brief needs no target, the wallet
  // lookup uses the shared query bar.
  const [chainView, setChainView] = useState<'brief' | 'wallet'>('brief');
  /** Free-text filter over the toolkit — 19 modules is too many to scan. */
  const [toolFilter, setToolFilter] = useState('');
  // Owned here, not by the view: toggling the expanded view remounts it.
  const fingerprint = useFingerprintSearch();
  /** DonBot's open token, kept for the same reason; its frame reloads on the remount, on the same token. */
  const [donbotQuery, setDonbotQuery] = useState<string | null>(null);

  const selectTool = useCallback((id: string) => {
    setActiveTab(id);
    setQuery('');
    setResults(null);
    setError('');
    setSweepResult(null);
  }, []);

  /** Mode chips: land on the real tool for a target type, via the same
   *  selectTool path a tile click takes. QUICK SCAN also arms the
   *  port scanner's quick mode, mirroring its secondary control. */
  const applyModeChip = useCallback((id: ModeChipId) => {
    switch (id) {
      case 'quick': selectTool('scanner'); setScanType('quick'); break;
      case 'ip': selectTool('scanner'); break;
      case 'domain': selectTool('dns'); break;
      case 'username': selectTool('username'); break;
      case 'email': selectTool('leaks'); break;
      case 'phone': selectTool('phone'); break;
    }
  }, [selectTool]);

  // Escape leaves the expanded view — it covers the map, so there must be a
  // way out that isn't hunting for the button.
  useEffect(() => {
    if (!isFullScreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullScreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullScreen]);

  const matchesFilter = useCallback((t: ToolDef) => {
    const q = toolFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      t.label.toLowerCase().includes(q) ||
      t.blurb.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  }, [toolFilter]);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  // Fetch CVE details when a device is expanded in full-screen mode
  const fetchCveDetails = useCallback(async (cveIds: string[]) => {
    const missing = cveIds.filter(id => !cveCache[id]);
    if (missing.length === 0) return;
    // Mark as loading
    setCveCache(prev => {
      const next = { ...prev };
      for (const id of missing) next[id] = { loading: true };
      return next;
    });
    // Fetch in parallel
    const results = await Promise.allSettled(
      missing.map(id => fetch(`/api/osint/cve?cve=${encodeURIComponent(id)}`).then(r => r.json()).then(data => ({ id, data })))
    );
    setCveCache(prev => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') {
          next[r.value.id] = r.value.data;
        }
      }
      return next;
    });
  }, [cveCache]);

    const handleSelfTrack = () => {
      setLoading(true);
      setError('');
      fetch('/api/geo')
        .then(r => {
          if (!r.ok) throw new Error(`Server returned ${r.status}`);
          return r.json();
        })
        .then(geo => {
          setLoading(false);
          if (geo.status === 'success' && geo.lat && geo.lon && onScanGeolocate) {
            onScanGeolocate(geo.query || 'local', {
              lat: geo.lat,
              lng: geo.lon,
              city: geo.city || 'Unknown',
              country: geo.country || 'Unknown',
              isp: geo.isp || 'Unknown',
              org: geo.org || 'Unknown',
              as: geo.as || 'Unknown',
              type: 'self_track'
            });
          } else {
            setError("Could not retrieve your IP location.");
          }
        })
        .catch(err => {
          setLoading(false);
          setError("Network error: " + err.message);
        });
    };

  const runLookup = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(''); setResults(null);

    // IP Sweep — separate flow (only for the sweep tab)
    if (activeTab === 'sweep') {
      setSweepResult(null);
      const cidr = sweepCidr;
      const totalHosts = Math.pow(2, 32 - cidr);
      setSweepProgress({ current: 0, total: totalHosts });
      try {
        const t0 = Date.now();
        const res = await fetch(`/api/osint/sweep?ip=${encodeURIComponent(query)}&cidr=${cidr}`);
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Sweep failed (${res.status})`); }
        const initData = await res.json();

        const ipParts = initData.target_ip.split('.').map(Number) as [number, number, number, number];
        const ipNum = ipToNumber(ipParts);
        const subnetStart = calculateSubnetStart(ipNum, cidr);
        const subnet = numberToIp(subnetStart);

        const urls: string[] = [];
        for (let i = 0; i < totalHosts; i++) {
          urls.push(`https://internetdb.shodan.io/${numberToIp((subnetStart + i) >>> 0)}`);
        }

        const shodanResults = await batchFetch<ShodanInternetDBResponse>(urls, 15, async (u) => {
          try {
            const r = await fetch(u, { cache: 'no-store' });
            if (r.status === 404) return null;
            if (!r.ok) return null;
            return await r.json();
          } catch {
            return null;
          }
        }, (done) => setSweepProgress({ current: done, total: totalHosts }));

        const devices: SweepDevice[] = [];
        const deviceBreakdown: Record<string, number> = {};
        for (const sr of shodanResults) {
          if (!sr) continue;
          const classification = classifyDevice(sr.ports, sr.cpes, sr.tags);
          const risk = assessRisk({ ports: sr.ports, vulns: sr.vulns });
          devices.push({
            ip: sr.ip, ports: sr.ports, hostnames: sr.hostnames,
            cpes: sr.cpes, vulns: sr.vulns, tags: sr.tags,
            device_type: classification.device_type,
            device_icon: classification.device_icon,
            device_color: classification.device_color,
            risk_level: risk
          });
          deviceBreakdown[classification.device_type] = (deviceBreakdown[classification.device_type] || 0) + 1;
        }

        setSweepResult({
          center: initData.center,
          subnet: `${subnet}/${cidr}`,
          cidr,
          target_ip: initData.target_ip,
          devices,
          summary: { total_hosts: totalHosts, total_responsive: devices.length, device_breakdown: deviceBreakdown },
          sweep_time_ms: Date.now() - t0
        });
        setSweepProgress(null);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
      } catch (err: any) {
        setError(err.message);
        setSweepProgress(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let url = '';
      switch (activeTab) {

        case 'dns': url = `/api/osint/dns?domain=${encodeURIComponent(query)}`; break;
        case 'certs': url = `/api/osint/certs?domain=${encodeURIComponent(query)}`; break;
        case 'whois': url = `/api/osint/whois?domain=${encodeURIComponent(query)}`; break;
        case 'threats': url = `/api/osint/threats?query=${encodeURIComponent(query)}`; break;
        case 'bgp': url = `/api/osint/bgp?query=${encodeURIComponent(query)}`; break;
        case 'mac': url = `/api/osint/mac?mac=${encodeURIComponent(query)}`; break;
        case 'phone': url = `/api/osint/phone?number=${encodeURIComponent(query)}`; break;
        case 'leaks': url = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(query)}`; break;
        case 'crypto': url = `/api/osint/crypto?address=${encodeURIComponent(query)}`; break;
        case 'username': url = `/api/osint/username?username=${encodeURIComponent(query)}`; break;
        case 'github': url = `/api/osint/github?user=${encodeURIComponent(query)}`; break;
        case 'vuln': url = `/api/scanner?target=${encodeURIComponent(query)}&type=vuln`; break;
        case 'scanner': url = `/api/scanner?target=${encodeURIComponent(query)}&type=${scanType}`; break;
        case 'headers': url = `/api/scanner?target=${encodeURIComponent(query)}&type=headers`; break;
        case 'ssl': url = `/api/scanner?target=${encodeURIComponent(query)}&type=ssl`; break;
        case 'subdomains': url = `/api/scanner?target=${encodeURIComponent(query)}&type=subdomains`; break;
        case 'tech': url = `/api/scanner?target=${encodeURIComponent(query)}&type=tech`; break;
        case 'shodan': url = `https://internetdb.shodan.io/${encodeURIComponent(query)}`; break;
      }
      const res = await fetch(url, activeTab === 'shodan' ? { cache: 'no-store' } : undefined);
      if (activeTab === 'shodan' && res.status === 404) {
        setResults({ ip: query, status: 'No Shodan InternetDB records found', ports: [], cpes: [], hostnames: [], tags: [], vulns: [] });
        setLoading(false);
        return;
      }
      if (activeTab === 'leaks' && res.status === 404) {
        setResults({ email: query, breached: false, breaches: [], data_exposed: [] });
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        let parsedData = data;
        if (activeTab === 'leaks') {
           let breachList: string[] = [];
           const dataExposed = new Set<string>();
           if (data.BreachesSummary && data.BreachesSummary.site) {
              breachList = data.BreachesSummary.site.split(';').filter(Boolean);
           }
           if (data.ExposedData && Array.isArray(data.ExposedData)) {
              data.ExposedData.forEach((item: any) => {
                 if (item.data_classes && Array.isArray(item.data_classes)) {
                    item.data_classes.forEach((dc: string) => dataExposed.add(dc));
                 }
              });
           }
           parsedData = {
              email: query,
              breached: breachList.length > 0,
              breaches: breachList,
              data_exposed: Array.from(dataExposed).sort()
           };
        }

        setResults(parsedData);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        
        // Geolocate the target in the background
        if (activeTab === 'phone') {
          if (data.lat && data.lng && onScanGeolocate) {
             onScanGeolocate(query, { lat: data.lat, lng: data.lng, type: 'phone', region: data.region });
          }
        } else if (activeTab !== 'sweep' && activeTab !== 'vuln' && activeTab !== 'crypto' && activeTab !== 'username' && activeTab !== 'mac' && activeTab !== 'bgp' && activeTab !== 'github' && activeTab !== 'leaks' && activeTab !== 'phone') {
          fetch(`/api/osint/ip?ip=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(locData => {
              if (locData && locData.geo && locData.geo.lat && locData.geo.lon && onScanGeolocate) {
                // ip-api returns lat/lon, we pass it up
                onScanGeolocate(query, { lat: locData.geo.lat, lng: locData.geo.lon, ...locData, type: activeTab });
              }
            })
            .catch(() => {});
        }
      } else {
        setError(data.error || 'Lookup failed');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [query, activeTab, scanType, loading, sweepCidr]);

  const currentTab = TABS.find(t => t.id === activeTab);

  // ── Shodan-style structured result renderers ──

  const ResultRow = ({ label, value, color, mono = true }: { label: string; value: any; color?: string; mono?: boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex items-start gap-3 py-1.5 border-b border-[var(--border-secondary)]/20 last:border-0">
        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider w-[90px] flex-shrink-0 pt-0.5">{label}</span>
        <span className={`text-[11px] ${mono ? 'font-mono' : ''} break-all flex-1`} style={{ color: color || 'var(--text-primary)' }}>
          {String(value)}
        </span>
      </div>
    );
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ok ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
      {ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );

  // Surfaces an inline OFAC-SDN hit (used by the WHOIS and IP-intel routes
  // when their cross-check finds a sanctioned registrant / ASN owner).
  const SanctionsBadge = ({ match }: { match: any }) => {
    if (!match || !Array.isArray(match.hits) || match.hits.length === 0) return null;
    return (
      <div className="mb-2 px-2 py-2 rounded border border-red-500/40 bg-red-500/15">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-mono font-bold text-red-400 tracking-wider">
            SANCTIONED — {match.source || 'OFAC SDN'}
          </span>
        </div>
        {match.hits.slice(0, 5).map((h: any, i: number) => (
          <div key={i} className="text-[10px] font-mono text-red-200 break-all leading-tight">
            <span className="text-[var(--text-muted)]">↳ {h.matched_value}:</span>{' '}
            {(h.entries || []).slice(0, 2).map((e: any) => e.name).join('; ')}
          </div>
        ))}
      </div>
    );
  };

  const SectionHeader = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
    <div className="flex items-center gap-2 mt-3 mb-1.5 first:mt-0">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-[11px] font-mono font-bold tracking-widest" style={{ color }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  );

  const PortRow = ({ port, state, service, version }: { port: number; state: string; service?: string; version?: string }) => (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--hover-accent)] transition-colors">
      <span className="text-[10px] font-mono font-bold text-[var(--cyan-primary)] w-[60px]">{port}</span>
      <StatusBadge ok={state === 'open'} label={state.toUpperCase()} />
      <span className="text-[11px] font-mono text-[var(--text-secondary)] flex-1">{service || 'unknown'}</span>
      {version && <span className="text-[10px] font-mono text-[var(--text-muted)]">{version}</span>}
    </div>
  );

  const renderStructuredResults = () => {
    // The daily brief is self-loading and needs no query, so it renders
    // regardless of whether a lookup has been run.
    if (activeTab === 'crypto' && chainView === 'brief') {
      return (
        <div>
          <SectionHeader title="CHAIN INTEL — DAILY BRIEF" icon={Bitcoin} color="#F7931A" />
          <ChainBrief />
        </div>
      );
    }
    if (!results) return null;
    const r = results;

    // ── PORT SCAN ──
    if (activeTab === 'scanner') {
      const ports = r.ports || r.open_ports || r.results || [];
      const host = r.host || r.target || query;
      return (
        <div>
          <SectionHeader title="HOST INFO" icon={Server} color="#00E5FF" />
          <ResultRow label="Target" value={host} color="#00E5FF" />
          <ResultRow label="Scan Type" value={r.scan_type || scanType} />
          <ResultRow label="Duration" value={r.duration || r.scan_time} />
          {Array.isArray(ports) && ports.length > 0 && (
            <>
              <SectionHeader title={`OPEN PORTS (${ports.length})`} icon={Wifi} color="#00E676" />
              <div className="space-y-0.5">
                {ports.map((p: any, i: number) => (
                  <PortRow key={i} port={p.port || p} state={p.state || 'open'} service={p.service || p.name} version={p.version} />
                ))}
              </div>
            </>
          )}
          {(!Array.isArray(ports) || ports.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── VULN SCAN ──
    if (activeTab === 'vuln') {
      const vulns = r.vulnerabilities || r.vulns || r.cves || [];
      const exploits = vulns.filter((v: any) => v.is_exploit);
      const regularVulns = vulns.filter((v: any) => !v.is_exploit);
      
      return (
        <div>
          <SectionHeader title="VULNERABILITY ASSESSMENT" icon={Bug} color="#FF3D3D" />
          <ResultRow label="Target" value={r.target || query} color="#FF3D3D" />
          <ResultRow label="Total CVEs" value={Array.isArray(vulns) ? vulns.length : 0} color={Array.isArray(vulns) && vulns.length > 0 ? '#FF3D3D' : '#00E676'} />
          <ResultRow label="Risk Level" value={r.risk_level || r.severity} />
          {Array.isArray(regularVulns) && regularVulns.length > 0 && (
            <div className="mt-2 space-y-1">
              {regularVulns.slice(0, 20).map((v: any, i: number) => (
                <div key={i} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-red-400">{v.id || v.cve || v.name}</span>
                    {v.severity && <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${v.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : v.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{v.severity}</span>}
                  </div>
                  {v.cvss && <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1">CVSS: {v.cvss} ({v.type || 'cve'})</div>}
                  {v.description && <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 line-clamp-2">{v.description}</p>}
                </div>
              ))}
            </div>
          )}
          
          {exploits.length > 0 && (
            <div className="mt-4">
              <SectionHeader title={`POSSIBLE EXPLOITS (${exploits.length})`} icon={AlertTriangle} color="#FF9500" />
              <div className="mt-2 space-y-1">
                {exploits.slice(0, 10).map((e: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg border border-orange-500/30 bg-orange-500/10 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-orange-400">{e.id}</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">EXPLOIT</span>
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1 flex justify-between">
                      <span>Source: {e.type?.toUpperCase() || 'UNKNOWN'}</span>
                      {e.cvss && <span>CVSS: {e.cvss}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!Array.isArray(vulns) || vulns.length === 0) && renderFallback()}
        </div>
      );
    }



    // ── DNS ──
    if (activeTab === 'dns') {
      return (
        <div>
          <SectionHeader title="DNS RECORDS" icon={Server} color="#448AFF" />
          <ResultRow label="Domain" value={r.domain || query} color="#448AFF" />
          {r.A && <ResultRow label="A Records" value={Array.isArray(r.A) ? r.A.join(', ') : r.A} />}
          {r.AAAA && <ResultRow label="AAAA" value={Array.isArray(r.AAAA) ? r.AAAA.join(', ') : r.AAAA} />}
          {r.MX && <ResultRow label="MX" value={Array.isArray(r.MX) ? r.MX.map((m:any) => m.exchange || m).join(', ') : r.MX} />}
          {r.NS && <ResultRow label="NS" value={Array.isArray(r.NS) ? r.NS.join(', ') : r.NS} />}
          {r.TXT && <ResultRow label="TXT" value={Array.isArray(r.TXT) ? r.TXT.join(' | ') : r.TXT} />}
          {r.CNAME && <ResultRow label="CNAME" value={Array.isArray(r.CNAME) ? r.CNAME.join(', ') : r.CNAME} />}
          {r.SOA && <ResultRow label="SOA" value={typeof r.SOA === 'object' ? `${r.SOA.nsname} (${r.SOA.hostmaster})` : r.SOA} />}
          {renderFallbackExcluding(['domain','A','AAAA','MX','NS','TXT','CNAME','SOA','timestamp','cached'])}
        </div>
      );
    }

    // ── WHOIS ──
    if (activeTab === 'whois') {
      return (
        <div>
          <SectionHeader title="WHOIS INTELLIGENCE" icon={FileText} color="#FFD700" />
          <SanctionsBadge match={r.sanctions_match} />
          <ResultRow label="Domain" value={r.domain_name || r.domainName || query} color="#FFD700" />
          <ResultRow label="Registrar" value={r.registrar} />
          <ResultRow label="Created" value={r.creation_date || r.createdDate} />
          <ResultRow label="Expires" value={r.expiration_date || r.expiresDate} />
          <ResultRow label="Updated" value={r.updated_date || r.updatedDate} />
          <ResultRow label="Status" value={Array.isArray(r.status) ? r.status.join(', ') : r.status} />
          <ResultRow label="Nameservers" value={Array.isArray(r.name_servers || r.nameServers) ? (r.name_servers || r.nameServers).join(', ') : r.name_servers} />
          {renderFallbackExcluding(['domain_name','domainName','registrar','creation_date','createdDate','expiration_date','expiresDate','updated_date','updatedDate','status','name_servers','nameServers','timestamp','cached','raw','sanctions_match'])}
        </div>
      );
    }

    // ── SHODAN ──
    if (activeTab === 'shodan') {
      return (
        <div>
          <SectionHeader title="SHODAN IOT INTELLIGENCE" icon={Network} color="#FF3D3D" />
          <ResultRow label="Target IP" value={r.ip || query} color="#FF3D3D" />
          {r.hostnames?.length > 0 && <ResultRow label="Hostnames" value={r.hostnames.join(', ')} />}
          {r.ports?.length > 0 && <ResultRow label="Open Ports" value={r.ports.join(', ')} color="#00E5FF" />}
          {r.tags?.length > 0 && <ResultRow label="Tags" value={r.tags.join(', ')} color="#FF9500" />}
          {r.vulns?.length > 0 && (
            <div className="mt-2 p-2 border border-red-500/30 bg-red-500/10 rounded">
              <span className="text-[11px] font-mono text-red-400 font-bold mb-1 block">VULNERABILITIES ({r.vulns.length})</span>
              <div className="flex flex-wrap gap-1">
                {r.vulns.slice(0, 10).map((v: string) => (
                  <a key={v} href={`https://nvd.nist.gov/vuln/detail/${v}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#8A8880] hover:text-[#FF3D3D]">{v}</a>
                ))}
                {r.vulns.length > 10 && <span className="text-[10px] font-mono text-[#8A8880]">+{r.vulns.length - 10} more</span>}
              </div>
            </div>
          )}
          {renderFallbackExcluding(['ip','hostnames','ports','tags','vulns','cpes'])}
        </div>
      );
    }

    // ── BGP ──
    if (activeTab === 'bgp') {
      return (
        <div>
          <SectionHeader title="BGP ROUTING INTELLIGENCE" icon={Globe} color="#00E5FF" />
          <ResultRow label="Query" value={r.query} color="#00E5FF" />
          {r.type === 'ip' && r.ip && (
            <>
              {r.ip.prefixes?.map((p: any, i: number) => (
                <div key={i} className="mt-2 p-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded">
                  <ResultRow label="ASN" value={`AS${p.asn.asn} - ${p.asn.name}`} color="#00E5FF" />
                  <ResultRow label="Prefix" value={p.prefix} />
                  <ResultRow label="Country" value={p.asn.country_code} />
                  <ResultRow label="Description" value={p.asn.description} />
                </div>
              ))}
            </>
          )}
          {r.type === 'asn' && r.asn && (
            <div className="mt-2 p-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded">
              <ResultRow label="ASN" value={`AS${r.asn.asn}`} color="#00E5FF" />
              <ResultRow label="Name" value={r.asn.name} />
              <ResultRow label="Description" value={r.asn.description} />
              <ResultRow label="Country" value={r.asn.country_code} />
              {r.prefixes && <ResultRow label="Prefixes" value={`IPv4: ${r.prefixes.total_v4} | IPv6: ${r.prefixes.total_v6}`} />}
              {r.peers && <ResultRow label="Peers" value={r.peers.total} />}
            </div>
          )}
          {renderFallbackExcluding(['query', 'type', 'ip', 'asn', 'prefixes', 'peers', 'timestamp'])}
        </div>
      );
    }

    // ── MAC ──
    if (activeTab === 'mac') {
      return (
        <div>
          <SectionHeader title="MAC VENDOR LOOKUP" icon={Fingerprint} color="#FFD700" />
          <ResultRow label="MAC Address" value={r.mac} color="#FFD700" />
          <ResultRow label="Vendor" value={r.vendor} color={r.vendor === 'Not Found' ? '#FF3D3D' : '#00E676'} />
        </div>
      );
    }

    // ── PHONE ──
    if (activeTab === 'phone') {
      return (
        <div>
          <SectionHeader title="PHONE INTELLIGENCE" icon={Phone} color="#FF9500" />
          <ResultRow label="Query" value={r.query} color="#FF9500" />
          <ResultRow label="Valid" value={r.valid ? 'YES' : 'NO'} color={r.valid ? '#00E676' : '#FF3D3D'} />
          {r.valid && (
            <>
              <ResultRow label="E.164 Format" value={r.number} />
              <ResultRow label="Intl Format" value={r.international} />
              <ResultRow label="Nat Format" value={r.national} />
              <ResultRow label="Country" value={`${r.region} (${r.country_code})`} />
              <ResultRow label="Line Type" value={r.line_type} color={r.line_type === 'MOBILE' ? '#00E5FF' : r.line_type === 'VOIP' ? '#FF9500' : undefined} />
            </>
          )}
        </div>
      );
    }

    // ── GITHUB ──
    if (activeTab === 'github') {
      return (
        <div>
          <SectionHeader title="GITHUB RECON" icon={Terminal} color="#87CEEB" />
          <div className="flex items-center gap-3 mb-2">
            {r.avatar_url && <img src={r.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border border-[#87CEEB]/30" />}
            <div>
              <div className="text-[11px] font-mono font-bold text-[#87CEEB]">{r.name || r.username}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)]">@{r.username} • {r.followers} followers</div>
            </div>
          </div>
          <ResultRow label="Company" value={r.company} />
          <ResultRow label="Location" value={r.location} />
          <ResultRow label="Email" value={r.email} color="#00E676" />
          <ResultRow label="Twitter" value={r.twitter} color="#448AFF" />
          <ResultRow label="Website" value={r.blog} />
          <ResultRow label="Bio" value={r.bio} />
          {r.recent_repos?.length > 0 && (
            <div className="mt-2 p-2 border border-[#87CEEB]/20 bg-[#87CEEB]/5 rounded">
              <span className="text-[10px] font-mono text-[#87CEEB] block mb-1">RECENT REPOS</span>
              {r.recent_repos.map((repo: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px] font-mono mb-0.5">
                  <span className="text-[#E8E6E0]">{repo.name}</span>
                  <span className="text-[var(--text-muted)]">{repo.language || 'Unknown'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── USERNAME HUNT ──
    if (activeTab === 'username') {
      const ACCENT = '#00E676';


      return (
        <div>
          <SectionHeader title="USERNAME HUNT" icon={User} color={ACCENT} />

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[
              { label: 'FOUND', value: r.found?.length ?? 0, color: ACCENT },
              { label: 'UNSURE', value: r.inconclusive?.length ?? 0, color: '#FF9500' },
              { label: 'BLOCKED', value: r.blocked?.length ?? 0, color: '#E040FB' },
              { label: 'CHECKED', value: r.checked ?? 0, color: '#87CEEB' },
            ].map((c: any) => (
              <div key={c.label} className="rounded border px-2 py-1.5" style={{ borderColor: `${c.color}33`, background: `${c.color}0d` }}>
                <div className="text-[9px] font-mono text-[var(--text-muted)]">{c.label}</div>
                <div className="text-[11px] font-mono font-bold" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          <ResultRow label="Handle" value={r.username} color={ACCENT} />
          <ResultRow
            label="Coverage"
            value={`${r.checked} of ${r.total_available} sites · ${r.not_found_count ?? 0} ruled out`}
          />
          <ResultRow label="Elapsed" value={r.elapsed_ms ? `${(r.elapsed_ms / 1000).toFixed(1)}s` : null} />

          {r.found?.length > 0 && (
            <>
              <SectionHeader title={`CONFIRMED ACCOUNTS (${r.found.length})`} icon={CheckCircle} color={ACCENT} />
              {r.found.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
                  <span className="w-[110px] flex-shrink-0 font-bold" style={{ color: ACCENT }}>{f.site}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 break-all text-[var(--text-secondary)] hover:text-white hover:underline flex items-center gap-1">
                    {f.url.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                </div>
              ))}
            </>
          )}

          {/* Positives that a control username also triggered — shown apart so
              they are never mistaken for real accounts. */}
          {r.inconclusive?.length > 0 && (
            <>
              <SectionHeader title={`UNVERIFIABLE (${r.inconclusive.length})`} icon={AlertTriangle} color="#FF9500" />
              <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug mb-1">
                These sites answered &quot;exists&quot; for a random control handle too, so a hit here is not evidence of an account.
              </div>
              {r.inconclusive.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9500]" />
                  <span className="w-[110px] flex-shrink-0 text-[#FF9500]">{f.site}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 break-all text-[var(--text-muted)] hover:text-white hover:underline">
                    {f.url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              ))}
            </>
          )}

          {/* Refused the request — absence was never established here, so these
              must not be silently folded into "not found". */}
          {r.blocked?.length > 0 && (
            <>
              <SectionHeader title={`BLOCKED — NOT CHECKED (${r.blocked.length})`} icon={ShieldAlert} color="#E040FB" />
              <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug mb-1">
                These sites refused the lookup, so nothing was learned either way — an account here is neither confirmed nor ruled out.
              </div>
              {r.blocked.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-0.5 text-[10px] font-mono">
                  <span className="w-[110px] flex-shrink-0 text-[#E040FB]">{f.site}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 break-all text-[var(--text-muted)] hover:text-white hover:underline">
                    check manually
                  </a>
                  <span className="text-[var(--text-muted)]">{f.reason}</span>
                </div>
              ))}
            </>
          )}

          {r.errors?.length > 0 && (
            <>
              <SectionHeader title={`UNREACHABLE (${r.errors.length})`} icon={XCircle} color="#FF3D3D" />
              {r.errors.slice(0, 10).map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-0.5 text-[10px] font-mono">
                  <span className="w-[110px] flex-shrink-0 text-[#FF3D3D]">{f.site}</span>
                  <span className="flex-1 text-[var(--text-muted)]">{f.reason}</span>
                </div>
              ))}
            </>
          )}

          {r.skipped?.length > 0 && (
            <>
              <SectionHeader title={`NOT APPLICABLE (${r.skipped.length})`} icon={XCircle} color="#5C5A54" />
              <div className="text-[10px] font-mono text-[var(--text-muted)] leading-snug">
                {r.skipped.map((s: any) => s.site).join(', ')} — the handle does not meet these sites&apos; username rules.
              </div>
            </>
          )}

          <div className="mt-3 text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
            {r.verified
              ? 'Every positive re-tested against a random control handle; sites that accepted it are listed as unverifiable. Calibration catches most soft 404s but is not exhaustive — confirm before acting.'
              : 'Calibration disabled — positives are unfiltered and include soft 404s.'}
            <br />Source: {r.source}
          </div>
        </div>
      );
    }

    // ── CHAIN INTEL ──
    // Shares /api/osint/crypto with the standalone CHAIN panel; this is the
    // in-toolkit view of the same wallet report.
    if (activeTab === 'crypto') {
      const ACCENT = '#F7931A';
      const RISK_COLOR: Record<string, string> = {
        critical: '#FF1744', high: '#FF3D3D', medium: '#FF9500', low: '#FFD700', info: '#00E676',
      };
      const riskColor = RISK_COLOR[r.risk?.level] || '#00E676';
      const fmt = (n: number, d = 4) =>
        typeof n === 'number' && Number.isFinite(n)
          ? n.toLocaleString(undefined, { maximumFractionDigits: d })
          : '—';
      const short = (a: string) => (a && a.length > 20 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a);

      return (
        <div>
          <SectionHeader title="CHAIN INTEL" icon={Bitcoin} color={ACCENT} />

          {/* A sanctions hit dominates the report — surface it before anything else. */}
          {r.sanctions?.hit && (
            <div className="mb-2 px-2 py-2 rounded border border-red-500/40 bg-red-500/15">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-mono font-bold text-red-400 tracking-wider">
                  OFAC SANCTIONED WALLET
                </span>
              </div>
              {(r.sanctions.entries || []).map((e: any, i: number) => (
                <div key={i} className="text-[10px] font-mono text-red-200 break-all leading-tight">
                  ↳ {e.name}{e.programs?.length ? ` — ${e.programs.join(', ')}` : ''}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              style={{ color: ACCENT, borderColor: `${ACCENT}55`, background: `${ACCENT}18` }}>
              {r.chain_label?.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              style={{ color: riskColor, borderColor: `${riskColor}55`, background: `${riskColor}18` }}>
              RISK {r.risk?.score} · {String(r.risk?.level || '').toUpperCase()}
            </span>
          </div>

          <ResultRow label="Address" value={r.address} color={ACCENT} />
          <ResultRow label="Balance" value={`${fmt(r.balance?.native, 8)} ${r.symbol}`} color="#00E676" />
          <ResultRow
            label="Value (USD)"
            value={r.balance?.usd != null ? `$${fmt(r.balance.usd, 2)}` : 'price unavailable'}
          />
          <ResultRow label="Spot price" value={r.balance?.price_usd != null ? `$${fmt(r.balance.price_usd, 2)}` : null} />
          <ResultRow label="Transactions" value={r.activity?.tx_count?.toLocaleString()} />
          <ResultRow label="Last active" value={r.activity?.last_seen ? `${String(r.activity.last_seen).slice(0, 10)} (${r.activity.dormant_days}d ago)` : null} />
          {/* age_days is withheld by the API whenever the sample cannot prove it. */}
          <ResultRow
            label="Age"
            value={r.activity?.age_days != null ? `${r.activity.age_days} days` : 'unknown — history exceeds sample'}
            color={r.activity?.age_days != null ? undefined : 'var(--text-muted)'}
          />
          {r.ambiguous_chain && (
            <ResultRow label="Note" value="Address format is valid on both Bitcoin and Solana; assumed Bitcoin." color="#FFD700" />
          )}

          {r.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {r.labels.map((l: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/15 text-[var(--text-secondary)] bg-white/5">
                  {l}
                </span>
              ))}
            </div>
          )}

          {r.flow && (
            <>
              <SectionHeader title="FLOW" icon={Layers} color={ACCENT} />
              <ResultRow label="Total in" value={`${fmt(r.flow.total_in)} ${r.symbol}`} color="#00E676" />
              <ResultRow label="Total out" value={`${fmt(r.flow.total_out)} ${r.symbol}`} color="#FF9500" />
              <ResultRow label="Net" value={`${fmt(r.flow.net)} ${r.symbol}`} />
            </>
          )}

          {r.risk?.factors?.length > 0 && (
            <>
              <SectionHeader title="RISK FACTORS" icon={AlertTriangle} color={riskColor} />
              {r.risk.factors.map((f: any, i: number) => (
                <div key={i} className="py-1.5 border-b border-[var(--border-secondary)]/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: RISK_COLOR[f.severity] || '#00E676' }}>
                      {f.label}
                    </span>
                    {f.weight > 0 && (
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">+{f.weight}</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug mt-0.5">{f.detail}</div>
                </div>
              ))}
            </>
          )}

          {r.counterparties?.length > 0 && (
            <>
              <SectionHeader title={`TOP COUNTERPARTIES (${r.counterparties.length})`} icon={Network} color={ACCENT} />
              {r.counterparties.slice(0, 10).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[10px] font-mono">
                  <span className={`w-[34px] flex-shrink-0 font-bold ${c.direction === 'out' ? 'text-[#FF9500]' : c.direction === 'in' ? 'text-[#00E676]' : 'text-[var(--text-muted)]'}`}>
                    {c.direction === 'out' ? 'OUT' : c.direction === 'in' ? 'IN' : 'BOTH'}
                  </span>
                  <span className="flex-1 break-all text-[var(--text-primary)]">{short(c.address)}</span>
                  <span className="text-[var(--text-muted)]">{c.txs}×</span>
                  <span className="text-[var(--text-secondary)] w-[70px] text-right">{fmt(c.value)}</span>
                </div>
              ))}
            </>
          )}

          {r.tokens?.length > 0 && (
            <>
              <SectionHeader title={`TOKENS (${r.tokens.length})`} icon={Layers} color={ACCENT} />
              <div className="flex flex-wrap gap-1">
                {r.tokens.slice(0, 20).map((t: any, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/15 bg-white/5 text-[var(--text-secondary)]">
                    {t.symbol}{t.amount != null ? ` ${fmt(t.amount, 2)}` : ''}
                  </span>
                ))}
              </div>
            </>
          )}

          {r.transactions?.length > 0 && (
            <>
              <SectionHeader title={`RECENT TRANSACTIONS (${r.transactions.length})`} icon={Clock} color={ACCENT} />
              {r.transactions.slice(0, 12).map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[10px] font-mono">
                  <span className={`w-[34px] flex-shrink-0 font-bold ${t.direction === 'out' ? 'text-[#FF9500]' : t.direction === 'in' ? 'text-[#00E676]' : 'text-[var(--text-muted)]'}`}>
                    {t.direction === 'unknown' ? '—' : t.direction.toUpperCase()}
                  </span>
                  <span className="text-[var(--text-muted)] w-[64px] flex-shrink-0">{t.time ? String(t.time).slice(0, 10) : 'pending'}</span>
                  <span className="flex-1 break-all text-[var(--text-primary)]">{short(t.hash)}</span>
                  {t.failed && <span className="text-[#FF3D3D]">FAIL</span>}
                  {t.value > 0 && <span className="text-[var(--text-secondary)]">{fmt(t.value)}</span>}
                </div>
              ))}
            </>
          )}

          {/* Honesty rail: what this report could not establish. */}
          {r.partial?.length > 0 && (
            <div className="mt-3 px-2 py-1.5 rounded border border-white/10 bg-white/[0.03]">
              <span className="text-[10px] font-mono text-[var(--text-muted)] block mb-0.5">COVERAGE LIMITS</span>
              {r.partial.map((p: string, i: number) => (
                <div key={i} className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug">↳ {p}</div>
              ))}
            </div>
          )}

          <div className="mt-2 text-[9px] font-mono text-[var(--text-muted)]">
            Sources: {(r.sources || []).join(' · ')}
            {r.activity && ` · sampled ${r.activity.sample_size} tx${r.activity.history_complete ? ' (full history)' : ' of a longer history'}`}
          </div>
        </div>
      );
    }

    // ── LEAKS ──
    if (activeTab === 'leaks') {
      return (
        <div>
          <SectionHeader title="DATA LEAK SWEEP" icon={ShieldAlert} color="#E040FB" />
          <ResultRow label="Email Target" value={r.email} color="#E040FB" />
          <ResultRow label="Status" value={r.breached ? 'COMPROMISED' : 'SECURE'} color={r.breached ? '#FF1744' : '#00E676'} />
          
          {r.breached && r.data_exposed?.length > 0 && (
            <div className="mt-2 p-2 border border-[#E040FB]/30 bg-[#E040FB]/10 rounded">
              <span className="text-[11px] font-mono text-[#E040FB] font-bold mb-1 block">EXPOSED DATA POINTS</span>
              <div className="flex flex-wrap gap-1">
                {r.data_exposed.map((dc: string) => (
                  <span key={dc} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#E8E6E0] border border-[#E040FB]/20">{dc}</span>
                ))}
              </div>
            </div>
          )}

          {r.breached && r.breaches?.length > 0 && (
            <div className="mt-2 p-2 border border-red-500/30 bg-red-500/10 rounded">
              <span className="text-[11px] font-mono text-red-400 font-bold mb-1 block">KNOWN BREACHES ({r.breaches.length})</span>
              <div className="flex flex-col gap-1">
                {r.breaches.map((b: string) => (
                  <a key={b} href={`https://haveibeenpwned.com/PwnedWebsites#${b}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono px-2 py-1 rounded bg-[#1A1A18] text-red-300 hover:text-white hover:bg-red-500/30 flex items-center justify-between transition-colors">
                    <span>{b}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── CERTS ──
    if (activeTab === 'certs') {
      const certs = r.certificates || r.certs || (Array.isArray(r) ? r : []);
      return (
        <div>
          <SectionHeader title="CERTIFICATE TRANSPARENCY" icon={Lock} color="#E040FB" />
          <ResultRow label="Domain" value={query} color="#E040FB" />
          <ResultRow label="Certificates" value={Array.isArray(certs) ? certs.length : 0} />
          {Array.isArray(certs) && certs.slice(0, 15).map((c: any, i: number) => (
            <div key={i} className="mt-1.5 p-2 rounded border border-[var(--border-secondary)]/30 bg-[var(--bg-tertiary)]/30">
              <ResultRow label="Issuer" value={c.issuer_name || c.issuer} />
              <ResultRow label="Common Name" value={c.common_name || c.name_value} />
              <ResultRow label="Not Before" value={c.not_before} />
              <ResultRow label="Not After" value={c.not_after} />
            </div>
          ))}
          {(!Array.isArray(certs) || certs.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── THREATS ──
    if (activeTab === 'threats') {
      return (
        <div>
          <SectionHeader title="THREAT INTELLIGENCE" icon={AlertTriangle} color="#FF9500" />
          <ResultRow label="Query" value={query} color="#FF9500" />
          <ResultRow label="Risk Score" value={r.risk_score || r.score} color={
            (r.risk_score || r.score || 0) > 70 ? '#FF3D3D' : (r.risk_score || r.score || 0) > 40 ? '#FF9500' : '#00E676'
          } />
          <ResultRow label="Malicious" value={r.malicious !== undefined ? (r.malicious ? 'YES' : 'NO') : undefined} color={r.malicious ? '#FF3D3D' : '#00E676'} />
          <ResultRow label="Category" value={r.category || r.type} />
          <ResultRow label="Reports" value={r.total_reports || r.reports} />
          <ResultRow label="Last Seen" value={r.last_seen || r.last_analysis} />
          {r.tags && <ResultRow label="Tags" value={Array.isArray(r.tags) ? r.tags.join(', ') : r.tags} />}
          {renderFallbackExcluding(['risk_score','score','malicious','category','type','total_reports','reports','last_seen','last_analysis','tags','timestamp','cached','query'])}
        </div>
      );
    }

    // ── SSL ──
    if (activeTab === 'ssl') {
      return (
        <div>
          <SectionHeader title="SSL/TLS ANALYSIS" icon={Shield} color="#76FF03" />
          <ResultRow label="Target" value={query} color="#76FF03" />
          <ResultRow label="Protocol" value={r.protocol || r.tls_version} />
          <ResultRow label="Cipher" value={r.cipher || r.cipher_suite} />
          <ResultRow label="Valid" value={r.valid !== undefined ? (r.valid ? 'YES' : 'NO') : undefined} color={r.valid ? '#00E676' : '#FF3D3D'} />
          <ResultRow label="Issuer" value={r.issuer} />
          <ResultRow label="Subject" value={r.subject} />
          <ResultRow label="Expires" value={r.expires || r.not_after} />
          <ResultRow label="SANs" value={Array.isArray(r.sans) ? r.sans.join(', ') : r.sans} />
          {renderFallback()}
        </div>
      );
    }



    // Fallback for other tools
    return renderFallback();
  };

  const renderFallback = () => {
    if (!results) return null;
    return (
      <div className="space-y-1">
        {Object.entries(results).filter(([k]) => !['timestamp','cached'].includes(k)).map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  const renderFallbackExcluding = (exclude: string[]) => {
    if (!results) return null;
    const extra = Object.entries(results).filter(([k]) => !exclude.includes(k));
    if (extra.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        {extra.map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  /* ── Expanded-view tool rail ──────────────────────────────────
     Fullscreen has room for the full label plus a one-line description, so
     the toolkit becomes a readable list rather than a grid of abbreviations. */
  const renderToolRail = () => (
    <div className="flex flex-col h-full">
      <div className="relative p-3 pb-2 flex-shrink-0">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7DD3FC]/60" />
        <input
          value={toolFilter}
          onChange={e => setToolFilter(e.target.value)}
          placeholder="Filter tools…"
          className="we-recon-input w-full pl-8 pr-7 py-2 text-[10px] font-mono placeholder:text-[#7DD3FC]/35 focus:outline-none"
        />
        {toolFilter && (
          <button onClick={() => setToolFilter('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 styled-scrollbar">
        {GROUPS.map(group => {
          const tools = TABS.filter(t => t.group === group.id && matchesFilter(t));
          if (!tools.length) return null;
          return (
            <div key={group.id} className="mb-3 last:mb-0">
              <div className="flex items-center gap-2 mb-1.5 pt-1">
                <group.icon className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-[10px] font-bold tracking-[0.18em] text-[#DCEEFF] uppercase">{group.label}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[rgba(56,150,255,0.4)] to-transparent" />
              </div>
              <div className="flex flex-col gap-0.5">
                {tools.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => selectTool(tab.id)}
                      className="group flex items-start gap-2.5 px-2 py-2 rounded-xl border text-left transition-all hover:border-[rgba(56,150,255,0.4)]"
                      style={{
                        borderColor: active ? `${tab.color}55` : 'transparent',
                        background: active ? `${tab.color}14` : undefined,
                      }}
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg border flex-shrink-0 transition-colors" style={{ borderColor: `${tab.color}40`, background: `${tab.color}12`, color: active ? tab.color : 'var(--text-muted)' }}>
                        <tab.icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block text-[10px] font-mono font-bold tracking-wider leading-tight"
                          style={{ color: active ? tab.color : 'var(--text-secondary)' }}
                        >
                          {tab.label}
                        </span>
                        <span className="block text-[10px] font-mono text-[var(--text-muted)] leading-snug">
                          {tab.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {toolFilter && !TABS.some(matchesFilter) && (
          <div className="text-[11px] font-mono text-[var(--text-muted)] py-3 text-center">
            No tool matches “{toolFilter}”.
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[rgba(56,150,255,0.25)] flex-shrink-0">
        <button
          onClick={handleSelfTrack}
          disabled={loading}
          className={`w-full py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${loading ? 'opacity-60 cursor-wait' : 'hover:bg-[var(--hover-accent)]'}`}
          style={{ borderColor: 'rgba(0, 230, 118, 0.25)' }}
        >
          <LocateFixed className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#00E676' }} />
          <span className="font-mono font-bold tracking-[0.1em] text-[11px]" style={{ color: '#00E676' }}>
            {loading ? 'TRACKING…' : 'SELF TRACK'}
          </span>
        </button>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="flex flex-col gap-2.5">
      <style>{RECON_STYLES}</style>
      {/* Tool board — omitted entirely in the expanded view, which uses the
          rail instead. Hiding it with CSS would leave a second "Filter tools"
          input in the DOM competing with the rail's. */}
      {!isFullScreen && (
      <div className="flex flex-col gap-1">
        {/* Filter — the same free-text filter state as before. */}
        <div className="relative mb-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7DD3FC]/60" />
          <input
            value={toolFilter}
            onChange={e => setToolFilter(e.target.value)}
            placeholder="Filter tools…"
            className="we-recon-input w-full pl-7 pr-6 py-1.5 text-[10px] font-mono placeholder:text-[#7DD3FC]/35 focus:outline-none"
          />
          {toolFilter && (
            <button onClick={() => setToolFilter('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#7DD3FC]/60 hover:text-white">
              <XCircle className="w-3 h-3" />
            </button>
          )}
        </div>

        {GROUPS.map(group => {
          const tools = TABS.filter(t => t.group === group.id && matchesFilter(t));
          const q = toolFilter.trim().toLowerCase();
          // Self Track is an action, not a TABS tool; it lives on the board
          // as a tile in the Geoint row (it geolocates the visitor's own IP
          // onto the globe) and stays findable through the filter.
          const showSelfTrack = group.id === 'geoint' && (!q || 'self track'.includes(q) || 'locate my ip'.includes(q));
          if (!tools.length && !showSelfTrack) return null;
          return (
            <div key={group.id} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-1.5">
                <group.icon className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-[10px] font-bold tracking-[0.18em] text-[#DCEEFF] uppercase">{group.label}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[rgba(56,150,255,0.4)] to-transparent" />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {tools.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => selectTool(tab.id)}
                      title={tab.blurb}
                      className="we-recon-tile"
                      style={active ? { borderColor: tab.color, boxShadow: `0 0 14px ${tab.color}40, inset 0 0 14px ${tab.color}14` } : undefined}>
                      <span className="we-recon-tile-icon" style={{ borderColor: `${tab.color}45`, background: `${tab.color}12`, color: tab.color }}>
                        <tab.icon className="w-4 h-4" />
                      </span>
                      <span className="we-recon-tile-label" style={{ color: active ? tab.color : 'rgba(196,224,255,0.82)' }}>{tab.tile ?? tab.label}</span>
                    </button>
                  );
                })}
                {showSelfTrack && (
                  <button onClick={handleSelfTrack} disabled={loading}
                    title="Geolocate your own IP and drop it on the globe"
                    className="we-recon-tile" style={loading ? { opacity: 0.6, cursor: 'wait' } : undefined}>
                    <span className="we-recon-tile-icon" style={{ borderColor: 'rgba(0,230,118,0.4)', background: 'rgba(0,230,118,0.08)', color: '#00E676' }}>
                      <LocateFixed className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </span>
                    <span className="we-recon-tile-label" style={{ color: 'rgba(196,224,255,0.82)' }}>{loading ? 'Tracking…' : 'Self\nTrack'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {toolFilter && !TABS.some(matchesFilter) && !'self track'.includes(toolFilter.trim().toLowerCase()) && (
          <div className="text-[10px] font-mono text-[var(--text-muted)] py-2 text-center">
            No tool matches “{toolFilter}”.
          </div>
        )}
      </div>
      )}

      {/* FINGERPRINT brings its own search bar, results and history. */}
      {activeTab === 'fingerprint' && <FingerprintSearch fp={fingerprint} isFullScreen={isFullScreen} />}

      {/* So does DONBOT — the same scan as Markets → Crypto, sealed in its own frame. */}
      {activeTab === 'donbot' && <DonBotScan initial={donbotQuery} onScan={setDonbotQuery} />}

      {/* And WORLD REMOTE — the Marauder BLE engine, formerly the REMOTE
          tab. It brings its own scan flow and device list; captured
          devices reach the globe through onPlaceDevicesOnMap, the same
          scan-target path its standalone mounts used. */}
      {activeTab === 'remote' && <WorldRemote onPlaceOnMap={onPlaceDevicesOnMap} />}

      {/* PHOTO GEO lives on its own page — the analysis works on an
          uploaded image, not a typed target — so its board view is the
          briefing card and the door. */}
      {activeTab === 'photogeo' && (
        <div className="we-recon-card" style={{ padding: '14px 14px 12px' }}>
          <div className="flex items-center gap-2" style={{ color: '#34D399' }}>
            <Camera className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold tracking-[0.14em]">PHOTO GEOLOCATION — BETA</span>
          </div>
          <p className="text-[10.5px] leading-relaxed mt-2" style={{ color: 'rgba(190,220,255,0.85)' }}>
            Upload a photo and WorldEye estimates where it was taken: embedded GPS first,
            then AI scene clues checked against OpenStreetMap. Every result is an
            evidence-ranked candidate with a confidence tier and an uncertainty radius —
            public places only, never a pinpointed home.
          </p>
          <ul className="text-[10px] leading-relaxed mt-2 font-mono" style={{ color: 'rgba(125,211,252,0.75)' }}>
            <li>· Uploads are processed in memory — never stored</li>
            <li>· Nearby live cameras + explore in 3D on every result</li>
            <li>· Free beta — 3 analyses a day</li>
          </ul>
          <a href="/tools/photo-geolocation" target="_blank" rel="noreferrer"
            className="we-recon-scanbtn inline-flex items-center justify-center gap-1.5 mt-3"
            style={{ textDecoration: 'none' }}>
            <Camera className="w-3.5 h-3.5" /> OPEN THE TOOL
          </a>
        </div>
      )}

      {/* WIFI SENSING also lives on its own page — the sensors are the
          visitor's own device (camera, WiFi link, or a RavenScope program
          on their computer), not a typed target — so its board view is
          likewise the briefing card and the door. */}
      {activeTab === 'sensing' && (
        <div className="we-recon-card" style={{ padding: '14px 14px 12px' }}>
          <div className="flex items-center gap-2" style={{ color: '#38BDF8' }}>
            <Wifi className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold tracking-[0.14em]">WIFI SENSING — FREE</span>
          </div>
          <p className="text-[10.5px] leading-relaxed mt-2" style={{ color: 'rgba(190,220,255,0.85)' }}>
            Sense presence and motion in a room with the WiFi and camera already there:
            RavenScope signal-strength sensing from your computer, WiFi link timing on any
            device, or on-device camera motion sensing. Motion only — no counting, no vitals.
          </p>
          <ul className="text-[10px] leading-relaxed mt-2 font-mono" style={{ color: 'rgba(125,211,252,0.75)' }}>
            <li>· Runs on your device — camera frames are never uploaded</li>
            <li>· Free — no account, no plan, no limits</li>
            <li>· Experimental: a perfectly still person reads as a still scene</li>
          </ul>
          <a href="/sensing" target="_blank" rel="noreferrer"
            className="we-recon-scanbtn inline-flex items-center justify-center gap-1.5 mt-3"
            style={{ textDecoration: 'none' }}>
            <Wifi className="w-3.5 h-3.5" /> OPEN THE TOOL
          </a>
        </div>
      )}

      {/* CINEMATIC DIRECTOR — the panel itself lives on the globe (it
          drives the map camera); this board view is the briefing card
          and the door, the same pattern as PHOTO GEO / WIFI SENSING.
          The Director used to float as a pill on the globe itself; its
          entry point moved here at the owner's order (2026-10-29). */}
      {activeTab === 'director' && (
        <div className="we-recon-card" style={{ padding: '14px 14px 12px' }}>
          <div className="flex items-center gap-2" style={{ color: '#D4AF37' }}>
            <Clapperboard className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold tracking-[0.14em]">CINEMATIC DIRECTOR</span>
          </div>
          <p className="text-[10.5px] leading-relaxed mt-2" style={{ color: 'rgba(190,220,255,0.85)' }}>
            Direct the globe camera: build keyframe scenes, play preset flights
            (camera tours, aircraft follow, space missions) and record the globe
            to a WebM video. Scenes you save live in this browser.
          </p>
          <ul className="text-[10px] leading-relaxed mt-2 font-mono" style={{ color: 'rgba(125,211,252,0.75)' }}>
            <li>· A free perk of the affiliate program — joining is free</li>
            <li>· Stays off until you switch it on in the affiliate dashboard</li>
            <li>· Recording captures the globe canvas in your browser</li>
          </ul>
          <button type="button" onClick={() => onOpenDirector?.()}
            className="we-recon-scanbtn inline-flex items-center justify-center gap-1.5 mt-3">
            <Clapperboard className="w-3.5 h-3.5" /> OPEN THE DIRECTOR
          </button>
        </div>
      )}

      {/* Scan bar — the board's target entry. Same state and handlers as
          before (query / runLookup / scanType / sweepCidr); only the skin
          and the chip presentation of the secondary controls are new. */}
      {activeTab !== 'fingerprint' && activeTab !== 'donbot' && activeTab !== 'remote' && activeTab !== 'photogeo' && activeTab !== 'sensing' && activeTab !== 'director' && (
      <div className="flex flex-col gap-1.5">
        {/* CHAIN INTEL view switch — the brief takes no target. */}
        {activeTab === 'crypto' && (
          <div className="flex gap-1">
            {([['brief', 'DAILY BRIEF'], ['wallet', 'WALLET FORENSICS']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setChainView(id)}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider transition-colors"
                style={{
                  color: chainView === id ? currentTab?.color : 'var(--text-muted)',
                  background: chainView === id ? `${currentTab?.color}1a` : 'transparent',
                  border: `1px solid ${chainView === id ? `${currentTab?.color}55` : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!(activeTab === 'crypto' && chainView === 'brief') && (
        <div className="we-recon-scanbar">
          <Search className="w-4 h-4 text-[#7DD3FC]/70 flex-shrink-0 ml-1" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runLookup()}
            placeholder={currentTab?.placeholder}
            className="flex-1 min-w-0 bg-transparent py-2 text-[11px] font-mono text-[#EAF6FF] placeholder:text-[#7DD3FC]/35 focus:outline-none" />
          <button onClick={runLookup} disabled={loading || !query.trim()}
            className="we-recon-scanbtn flex items-center justify-center gap-1.5 flex-shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
            SCAN
          </button>
        </div>
        )}

        {/* Secondary controls — the port scanner's modes and the sweep's
            subnet mask, as chips over the same state values as before. */}
        {activeTab === 'scanner' && (
          <div className="flex gap-1.5">
            {([['quick', 'QUICK SCAN'], ['deep', 'DEEP SCAN'], ['ports', 'TOP 1000 PORTS']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setScanType(v)} data-active={scanType === v}
                className="we-recon-chip flex-1 justify-center">{label}</button>
            ))}
          </div>
        )}
        {activeTab === 'sweep' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold tracking-[0.14em] text-[#7DD3FC]/70 flex-shrink-0">SUBNET</span>
            <div className="flex gap-1 flex-1">
              {[24, 25, 26, 27, 28].map(c => (
                <button key={c} onClick={() => setSweepCidr(c)} data-active={sweepCidr === c}
                  className="we-recon-chip flex-1 justify-center">/{c}</button>
              ))}
            </div>
          </div>
        )}

        {/* Target-type mode chips (the board's bottom row) — shortcuts onto
            the real tool for each input type; the lit chip is derived from
            the active tool via modeForTool, never stored state. */}
        <div className="flex flex-wrap gap-1.5">
          {MODE_CHIPS.map(chip => (
            <button key={chip.id} onClick={() => applyModeChip(chip.id)}
              data-active={modeForTool(activeTab, scanType) === chip.id}
              className="we-recon-chip justify-center" style={{ flex: '1 1 calc(33% - 6px)' }}>
              <chip.icon className="w-3 h-3" />{chip.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-mono text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Sweep Progress */}
      {sweepProgress && loading && (
        <div className="p-3 rounded-lg border border-[#FF3D3D]/30 bg-[#FF3D3D]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider text-[#FF3D3D]">SWEEPING SUBNET...</span>
            <span className="text-[11px] font-mono text-[#E8E6E0]">{sweepProgress.total} hosts</span>
          </div>
          <div className="w-full h-1.5 bg-[#1A1A18] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #FF3D3D, #FF6B00, #FFD700)', animation: 'sweep-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Sweep Results */}
      {sweepResult && !loading && activeTab === 'sweep' && (
        <div className="we-recon-card overflow-hidden max-h-[55vh] overflow-y-auto styled-scrollbar">
          {/* Summary */}
          <div className="p-3 border-b border-[#2A2A28]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-mono tracking-wider text-[#E8E6E0]">{sweepResult.subnet}</div>
                <div className="text-[10px] font-mono text-[#5C5A54]">{sweepResult.center.city}, {sweepResult.center.country} · {sweepResult.center.isp}</div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-mono font-bold text-[#FF3D3D]">{sweepResult.summary.total_responsive}</div>
                <div className="text-[9px] font-mono text-[#5C5A54] tracking-wider">DEVICES FOUND</div>
              </div>
            </div>
            {/* Breakdown Bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-[#1A1A18] mb-2">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return <div key={type} style={{ width: `${(count / sweepResult.summary.total_responsive) * 100}%`, backgroundColor: device?.device_color || '#666' }} title={`${type}: ${count}`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: device?.device_color || '#666' }} />
                    <span className="text-[10px] font-mono text-[#8A8880]">{type}</span>
                    <span className="text-[10px] font-mono text-[#E8E6E0] font-bold">{String(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Visualize Button */}
          <div className="p-3 border-b border-[#2A2A28]">
            <button onClick={() => onSweepVisualize?.(sweepResult)}
              className="w-full py-2.5 rounded-lg font-mono text-[10px] tracking-wider font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgba(255,61,61,0.2), rgba(255,107,0,0.2))', border: '1px solid rgba(255,61,61,0.5)', color: '#FF3D3D', textShadow: '0 0 10px rgba(255,61,61,0.5)' }}
            >
              <Globe className="w-4 h-4" /> VISUALIZE ON GLOBE
            </button>
          </div>
          {/* Device List */}
          <div className={isFullScreen ? "flex flex-col gap-3 p-4" : "divide-y divide-[#2A2A28]"}>
            {sweepResult.devices.map((device: any) => {
              const isExpanded = expandedDevice === device.ip;
              return (
              <div key={device.ip} className={isFullScreen
                ? "bg-[#0D0D0C] border border-[#2A2A28] rounded-lg overflow-hidden hover:border-[#3A3A38] transition-colors"
                : "px-3 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              }>
                {/* Device Header */}
                <div
                  className={isFullScreen
                    ? "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#151514] transition-colors"
                    : "flex items-center justify-between mb-1"
                  }
                  onClick={() => {
                    if (!isFullScreen) return;
                    const next = isExpanded ? null : device.ip;
                    setExpandedDevice(next);
                    if (next && device.vulns.length > 0) fetchCveDetails(device.vulns);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: device.device_color }} />
                    <span className={`flex-shrink-0 ${isFullScreen ? "text-[14px]" : "text-[10px]"} font-mono font-bold text-[#E8E6E0]`}>{device.ip}</span>
                    {device.hostnames.length > 0 && (
                      <span className={`${isFullScreen ? "text-[10px]" : "text-[10px]"} font-mono text-[#5C5A54] truncate min-w-0`}>{device.hostnames[0]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {device.vulns.length > 0 && (
                      <span className={`${isFullScreen ? "text-[11px]" : "text-[9px]"} font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap`}>
                        {device.vulns.length} CVEs
                      </span>
                    )}
                    <span className={`${isFullScreen ? "text-[11px]" : "text-[9px]"} font-mono px-1.5 py-0.5 rounded whitespace-nowrap`} style={{ backgroundColor: device.device_color + '20', color: device.device_color, border: `1px solid ${device.device_color}40` }}>{device.device_type}</span>
                    {isFullScreen && (
                      <ChevronDown className={`w-4 h-4 text-[#5C5A54] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </div>

                {/* Compact info (sidebar mode) */}
                {!isFullScreen && (
                  <>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#5C5A54]">
                      <span>Ports: {device.ports.slice(0, 8).join(', ')}{device.ports.length > 8 ? ` +${device.ports.length - 8}` : ''}</span>
                      {device.vulns.length > 0 && (
                        <div className="group relative flex items-center gap-1 cursor-help">
                          <span className="text-[#FF3D3D] flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> {device.vulns.length} CVEs
                          </span>
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 p-2 bg-[#1A1A18] border border-[#FF3D3D50] rounded-md shadow-xl min-w-[140px] max-w-[220px] max-h-[150px] overflow-y-auto styled-scrollbar">
                            <div className="text-[9px] font-mono text-[#FF3D3D] mb-1 tracking-wider uppercase border-b border-[#FF3D3D30] pb-1">Identified Vulnerabilities</div>
                            <div className="flex flex-col gap-0.5">
                              {device.vulns.map((cve: string) => (
                                <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-[#E8E6E0] hover:text-[#FF3D3D] transition-colors truncate">
                                  {cve}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {device.hostnames.length > 0 && <div className="text-[10px] font-mono text-[#8A8880] mt-0.5 truncate">{device.hostnames[0]}</div>}
                  </>
                )}

                {/* Full-Screen Expanded Detail */}
                {isFullScreen && isExpanded && (
                  <div className="border-t border-[#2A2A28]">
                    {/* Ports + Hostnames Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28]">
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[11px] font-mono text-[#5C5A54] tracking-widest uppercase mb-2">Open Ports</div>
                        <div className="flex flex-wrap gap-1.5">
                          {device.ports.map((port: number) => (
                            <span key={port} className="px-2 py-1 bg-[#1A1A18] border border-[#2A2A28] rounded text-[10px] font-mono text-[var(--cyan-primary)]">{port}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[11px] font-mono text-[#5C5A54] tracking-widest uppercase mb-2">Hostnames</div>
                        {device.hostnames.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {device.hostnames.map((h: string) => (
                              <span key={h} className="text-[10px] font-mono text-[#E8E6E0]">{h}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-[#3A3A38]">No reverse DNS</span>
                        )}
                      </div>
                    </div>

                    {/* CVE Intelligence */}
                    {device.vulns.length > 0 && (
                      <div className="p-4 border-t border-[#2A2A28]">
                        <div className="text-[11px] font-mono text-[#5C5A54] tracking-widest uppercase mb-3">Vulnerabilities ({device.vulns.length})</div>
                        <div className="flex flex-col gap-2">
                          {device.vulns.map((cveId: string) => {
                            const info = cveCache[cveId];
                            const isLoading = !info || info.loading;
                            const severityColor = !info?.severity ? '#5C5A54'
                              : info.severity === 'CRITICAL' ? '#FF3D3D'
                              : info.severity === 'HIGH' ? '#FF6B00'
                              : info.severity === 'MEDIUM' ? '#FFD700'
                              : '#76FF03';
                            return (
                              <div key={cveId} className="bg-[#111] border border-[#2A2A28] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold text-[#E8E6E0]">{cveId}</span>
                                    {info?.cvss != null && (
                                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>CVSS {info.cvss}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {info?.severity && (
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>{info.severity}</span>
                                    )}
                                    <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noreferrer" className="text-[#5C5A54] hover:text-[#E8E6E0] transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                                {isLoading ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <Loader2 className="w-3 h-3 animate-spin text-[#5C5A54]" />
                                    <span className="text-[11px] font-mono text-[#5C5A54]">Fetching vulnerability intelligence...</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[10px] font-mono text-[#8A8880] leading-relaxed">{info.description}</p>
                                    {info.cwe && <div className="text-[11px] font-mono text-[#5C5A54] mt-2">Weakness: {info.cwe}</div>}
                                    {info.affected && info.affected.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {info.affected.map((a: any, i: number) => (
                                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1A1A18] border border-[#2A2A28] rounded text-[#8A8880]">
                                            {a.vendor}/{a.product}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
          <div className="px-3 py-2 border-t border-[#2A2A28]">
            <div className="text-[9px] font-mono text-[#5C5A54] tracking-wider">SWEPT {sweepResult.summary.total_hosts} HOSTS IN {(sweepResult.sweep_time_ms / 1000).toFixed(1)}s · ASN {sweepResult.center.asn}</div>
          </div>
        </div>
      )}

      {(results || (activeTab === 'crypto' && chainView === 'brief')) && !(sweepResult && !loading) && (
        <div className="we-recon-card p-3 max-h-[50vh] overflow-y-auto styled-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest" style={{ color: currentTab?.color }}>{currentTab?.label} RESULTS</span>
            <span className="text-[9px] font-mono text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date().toLocaleTimeString()}</span>
          </div>
          {renderStructuredResults()}
        </div>
      )}

      {history.length > 0 && !results && activeTab !== 'fingerprint' && activeTab !== 'donbot' && activeTab !== 'remote' && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">RECENT SCANS</span>
          {history.slice(0, 5).map((h, i) => (
            <button key={i} onClick={() => { setActiveTab(h.tab); setQuery(h.query); }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono" style={{ color: TABS.find(t => t.id === h.tab)?.color }}>{TABS.find(t => t.id === h.tab)?.label}</span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">{h.query}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">{h.time}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) return renderContent();

  if (isFullScreen) {
    const fullScreenNode = (
      <div className="fixed inset-4 z-[999] flex items-center justify-center">
        {/* Click-away backdrop; Escape also exits. */}
        <div className="absolute inset-[-1rem] bg-black/60 backdrop-blur-sm" onClick={() => setIsFullScreen(false)} />

        <div className="relative w-full h-full max-w-[1500px] glass-panel backdrop-blur-2xl flex flex-col overflow-hidden shadow-2xl" style={{ ...RECON_FRAME_STYLE, borderRadius: 18 }}>
          <div className="we-recon-header" style={{ padding: '12px 20px' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="we-recon-medallion" aria-hidden="true">
                <img src="/worldeye-eye.png" alt="" className="w-[26px] h-[26px] rounded-full relative" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="we-recon-title">RECON</span>
                  <span className="we-recon-premium"><Crown className="w-2.5 h-2.5" /> PREMIUM</span>
                  <span className="text-[9px] font-mono font-bold tracking-[0.14em] text-[#7DD3FC]/70 border border-[rgba(56,150,255,0.35)] rounded-full px-2 py-0.5 whitespace-nowrap">{TABS.length} MODULES</span>
                </span>
                <span className="we-recon-subtitle block">Advanced reconnaissance, intelligence and analysis tools</span>
              </span>
              {currentTab && (
                <>
                  <span className="text-[var(--text-muted)]/40">/</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <currentTab.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentTab.color }} />
                    <span className="text-[11px] font-mono font-bold tracking-wider truncate" style={{ color: currentTab.color }}>
                      {currentTab.label}
                    </span>
                  </span>
                </>
              )}
            </div>
            <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-white/5 rounded transition-colors text-[var(--text-muted)] hover:text-white flex-shrink-0" title="Exit expanded view (Esc)">
              <Minimize2 className="w-5 h-5" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded transition-colors text-[var(--text-muted)] hover:text-white flex-shrink-0" title="Close" aria-label="Close OSINT Recon">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Two panes: the toolkit stays visible while results use the width. */}
          <div className="flex-1 flex min-h-0">
            <aside className="w-[260px] flex-shrink-0 border-r border-[rgba(56,150,255,0.25)] bg-[rgba(4,18,36,0.6)]">
              {renderToolRail()}
            </aside>
            <main className="flex-1 min-w-0 overflow-y-auto p-6 styled-scrollbar">
              <div className="w-full full-screen-mode-content max-w-[1000px]">
                {currentTab && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2.5 mb-1">
                      <currentTab.icon className="w-5 h-5" style={{ color: currentTab.color }} />
                      <h2 className="text-[15px] font-mono font-bold tracking-widest" style={{ color: currentTab.color }}>
                        {currentTab.label}
                      </h2>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">{currentTab.blurb}</p>
                  </div>
                )}
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(fullScreenNode, document.body) : fullScreenNode;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} style={RECON_FRAME_STYLE} className="glass-panel flex flex-col overflow-hidden pointer-events-auto shrink-0 h-[500px] max-h-[80vh] resize-y">
      <div className="we-recon-header">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 flex-1 min-w-0 text-left" title={expanded ? 'Collapse panel' : 'Expand panel'}>
          <span className="we-recon-medallion" aria-hidden="true">
            <img src="/worldeye-eye.png" alt="" className="w-[26px] h-[26px] rounded-full relative" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="we-recon-title">RECON</span>
              <span className="we-recon-premium"><Crown className="w-2.5 h-2.5" /> PREMIUM</span>
            </span>
            <span className="we-recon-subtitle block">Advanced reconnaissance, intelligence and analysis tools</span>
          </span>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setIsFullScreen(true)} className="p-1.5 rounded text-[#7DD3FC]/70 hover:text-white hover:bg-white/10 transition-colors" title="Full Screen">
             <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-osiris-pulse" />
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded text-[#7DD3FC]/70 hover:text-white hover:bg-white/10 transition-colors" title={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded text-[#7DD3FC]/70 hover:text-white hover:bg-white/10 transition-colors" title="Close" aria-label="Close OSINT Recon">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-y-auto px-3 py-3 flex-1 min-h-0 styled-scrollbar">
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const OsintPanel = memo(OsintPanelInner);
export default OsintPanel;
