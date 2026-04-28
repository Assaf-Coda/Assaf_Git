import React, { useState, useRef, useEffect } from 'react';
import octaveLogoWhite from './assets/octave-logo-white.png';
import octaveFontUrl from './assets/OctaveDisplay-Regular.otf';
import cam1Breakroom from './assets/cam1-breakroom.jpg';
import cam2Cafeteria from './assets/cam2-cafeteria.jpg';
import cam3Elevator from './assets/cam3-elevator.jpg';
import cam4Entrance from './assets/cam4-entrance.jpg';
import {
  LayoutDashboard, Monitor, ShieldCheck, Bell, Search, Archive, Settings,
  HelpCircle, ChevronLeft, ChevronRight, ChevronDown, Folder, Video, Camera,
  Bookmark, Maximize2, MoreVertical, Plus, RefreshCw, Grid3x3, Map, Tv,
  WifiOff, Rewind, ZoomIn, Eye, EyeOff, Filter, Clock,
  PanelLeftClose, PanelLeftOpen, Play, Pause, SkipBack, SkipForward,
  Link2, Calendar, Download, AlertTriangle, ArrowRight, Volume2, VolumeX,
  CameraOff, Mic, MicOff, RotateCcw, ScreenShare,
} from 'lucide-react';

// ---- Tokens -------------------------------------------------------------
const tokens = {
  bgApp: '#F4F6F8',
  bgPanel: '#FFFFFF',
  bgTopbar: '#00AA14',
  bgTile: '#0F1419',
  bgGridArea: '#1A1F26',
  bgHover: 'rgba(15, 20, 25, 0.04)',
  bgSelected: '#E3F2FD',

  textPrimary: '#1A1F26',
  textSecondary: '#5A6470',
  textHint: '#8A95A0',

  primary: '#1976D2',
  primaryLight: '#E3F2FD',
  liveGreen: '#2E7D32',
  liveGreenBright: '#43A047',
  recordingGreen: '#4CAF50',
  recordingGreenDark: '#388E3C',
  recordingRed: '#D32F2F',
  warning: '#F57C00',
  aiPurple: '#7B3FA0',
  bookmarkBlue: '#1976D2',
  offline: '#9E9E9E',

  border: '#E0E4E8',
  divider: '#EEF1F4',

  shadow1: '0 1px 2px rgba(15, 20, 25, 0.04), 0 1px 3px rgba(15, 20, 25, 0.06)',
  shadow2: '0 2px 4px rgba(15, 20, 25, 0.06), 0 4px 12px rgba(15, 20, 25, 0.08)',
};

function useViewportWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ---- Mock data ----------------------------------------------------------
const sites = [
  { name: 'BBT City Airport', expanded: false, cameraCount: 7, onlineCount: 5, cameras: [] },
  { name: 'Department Store', expanded: false, cameraCount: 12, onlineCount: 12, cameras: [] },
  { name: 'Downtown', expanded: false, cameraCount: 8, onlineCount: 7, cameras: [] },
  { name: 'Eaton Centre', expanded: false, cameraCount: 5, onlineCount: 4, cameras: [] },
  {
    name: 'Toronto Office', expanded: true, cameraCount: 11, onlineCount: 9,
    cameras: [
      { name: 'Office 103-105', status: 'online', cameraId: 'TOR-014' },
      { name: 'Main Road', status: 'recording', cameraId: 'TOR-002' },
      { name: 'Office 1', status: 'online', cameraId: 'TOR-015' },
      { name: 'Office 3', status: 'online', cameraId: 'TOR-017' },
      { name: 'Suppliers entrance PTZ', status: 'recording', cameraId: 'TOR-003' },
      { name: 'Camera floor 2', status: 'online', cameraId: 'TOR-018' },
      { name: 'South Parking', status: 'recording', cameraId: 'TOR-001', selected: true },
      { name: 'Lab', status: 'online', cameraId: 'TOR-019' },
      { name: 'Hanwha QNV-8010R', status: 'recording', cameraId: 'TOR-020' },
    ],
  },
];

const tiles = [
  { id: 1, position: 1, cameraName: 'New Break Room', cameraId: 'HQ-001', site: 'HQ Office', status: 'recording', timestamp: '13:24:56', motion: true, isPTZ: false, image: cam1Breakroom },
  { id: 2, position: 2, cameraName: 'HQ Cafeteria', cameraId: 'HQ-002', site: 'HQ Office', status: 'recording', timestamp: '13:24:55', motion: false, isPTZ: true, image: cam2Cafeteria },
  { id: 3, position: 3, cameraName: 'HQ Elevator 1', cameraId: 'HQ-003', site: 'HQ Office', status: 'online', timestamp: '13:24:54', motion: true, isPTZ: false, image: cam3Elevator },
  { id: 4, position: 4, cameraName: 'HQ Front Entrance', cameraId: 'HQ-004', site: 'HQ Office', status: 'recording', timestamp: '13:24:53', motion: false, isPTZ: false, image: cam4Entrance },
];

const timelineEvents = {
  'TOR-001': [
    { type: 'motion', position: 8 },
    { type: 'motion', position: 18 },
    { type: 'ai', position: 28, label: 'Person detected' },
    { type: 'motion', position: 38 },
    { type: 'alert', position: 48, label: 'Loitering detected' },
    { type: 'motion', position: 56 },
    { type: 'ai', position: 64, label: 'Vehicle detected' },
    { type: 'bookmark', position: 71, label: 'Suspicious activity' },
    { type: 'motion', position: 78 },
    { type: 'motion', position: 88 },
  ],
  'IL-007': [
    { type: 'motion', position: 12 },
    { type: 'ai', position: 32 },
    { type: 'motion', position: 52 },
    { type: 'motion', position: 67 },
  ],
  'IL-005': [
    { type: 'motion', position: 22 },
    { type: 'alert', position: 44, label: 'Door propped open' },
    { type: 'motion', position: 76 },
  ],
};

const recordingGaps = {
  'TOR-001': [],
  'IL-007': [{ start: 25, end: 35 }],
  'IL-005': [{ start: 55, end: 60 }],
};

const alarms = [
  { id: 1, severity: 'critical', type: 'alert', title: 'Loitering detected', cameraName: 'South Parking', cameraId: 'TOR-001', site: 'Toronto Office', timestamp: '13:21:42', timeAgo: '3 min ago', status: 'new', description: 'Person detected stationary for >5 minutes near entrance' },
  { id: 2, severity: 'high', type: 'alert', title: 'Door propped open', cameraName: 'IL HQ Augustin', cameraId: 'IL-005', site: 'IL office', timestamp: '13:18:11', timeAgo: '7 min ago', status: 'new', description: 'Service entrance door open >2 minutes' },
  { id: 3, severity: 'medium', type: 'ai', title: 'Vehicle detected in restricted area', cameraName: 'Main Road', cameraId: 'TOR-002', site: 'Toronto Office', timestamp: '13:14:33', timeAgo: '11 min ago', status: 'acknowledged', description: 'Unauthorized vehicle in employee-only zone' },
  { id: 4, severity: 'critical', type: 'alert', title: 'Camera connection lost', cameraName: 'Gate C07', cameraId: 'BBT-022', site: 'BBT City Airport', timestamp: '12:45:00', timeAgo: '40 min ago', status: 'new', description: 'Camera offline, last heartbeat 12:45' },
  { id: 5, severity: 'low', type: 'motion', title: 'After-hours motion', cameraName: 'Suppliers entrance PTZ', cameraId: 'TOR-003', site: 'Toronto Office', timestamp: '12:32:18', timeAgo: '53 min ago', status: 'resolved', description: 'Motion detected outside business hours' },
  { id: 6, severity: 'medium', type: 'ai', title: 'Person detected', cameraName: 'Office 103-105', cameraId: 'TOR-014', site: 'Toronto Office', timestamp: '12:18:47', timeAgo: '67 min ago', status: 'acknowledged', description: 'Unknown person in restricted office area' },
];

// ---- Reusable bits ------------------------------------------------------

function StatusDot({ status, size = 8, animated = false }) {
  const colorMap = {
    recording: tokens.recordingRed,
    online: tokens.liveGreenBright,
    offline: tokens.offline,
  };
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      backgroundColor: colorMap[status] || tokens.offline, flexShrink: 0,
      animation: animated && status === 'recording' ? 'pulse 2s infinite' : 'none',
    }} />
  );
}

function IconButton({ icon: Icon, label, onClick, active, size = 16, dark = false, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      aria-label={label}
      style={{
        background: active ? (dark ? 'rgba(255,255,255,0.18)' : tokens.primaryLight) : hover ? (dark ? 'rgba(255,255,255,0.10)' : tokens.bgHover) : 'transparent',
        border: 'none', borderRadius: 4, padding: 6, cursor: 'pointer',
        color: active ? (dark ? '#fff' : tokens.primary) : dark ? 'rgba(255,255,255,0.85)' : tokens.textSecondary,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 120ms ease, color 120ms ease', position: 'relative',
      }}
    >
      <Icon size={size} strokeWidth={1.8} />
      {badge && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: tokens.recordingRed, color: '#fff',
          fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
          padding: '0 4px', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

function CameraFrame({ src, name }) {
  if (src && typeof src !== 'string') {
    // imported image module
    return <img src={src} alt={name || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  if (typeof src === 'string' && (src.startsWith('/') || src.startsWith('data:') || src.endsWith('.jpg') || src.endsWith('.png'))) {
    return <img src={src} alt={name || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return <FauxFrame kind={src} />;
}

function FauxFrame({ kind }) {
  if (kind === 'offline') {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#0a0d12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 6,
      }}>
        <WifiOff size={28} color="#5A6470" strokeWidth={1.5} />
        <div style={{ color: '#8A95A0', fontSize: 12, fontWeight: 500 }}>Camera offline</div>
        <div style={{ color: '#5A6470', fontSize: 11 }}>since 12:45 today</div>
        <button style={{
          marginTop: 4, background: 'transparent', border: '1px solid #2A323C',
          color: '#A8B0BC', padding: '4px 12px', borderRadius: 4, fontSize: 11,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <RefreshCw size={11} />Retry
        </button>
      </div>
    );
  }

  const palettes = {
    parking: { sky: 'linear-gradient(180deg, #c5d4e0 0%, #a8b8c5 35%, #6b7585 100%)', accent: '#3a4450', dark: '#1f262e' },
    entrance: { sky: 'linear-gradient(180deg, #2a3038 0%, #1a1f26 100%)', accent: '#454d57', dark: '#2a3038' },
    augustin: { sky: 'linear-gradient(180deg, #8a8a8a 0%, #5a5a5a 100%)', accent: '#3a3a3a', dark: '#1a1a1a' },
  };
  const p = palettes[kind] || palettes.parking;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: p.sky }} />
      <div style={{
        position: 'absolute', left: '5%', right: '5%', bottom: '40%', height: '15%',
        background: p.accent, opacity: 0.6,
        clipPath: 'polygon(0 100%, 8% 60%, 18% 70%, 28% 40%, 42% 55%, 55% 30%, 70% 50%, 85% 35%, 100% 60%, 100% 100%)',
      }} />
      {[0.45, 0.6, 0.75].map((bottom, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0, bottom: `${bottom * 100}%`, height: '8%',
          background: `repeating-linear-gradient(90deg, ${p.dark} 0 18px, transparent 18px 22px)`,
          opacity: 0.7 - i * 0.15,
        }} />
      ))}
      {kind === 'parking' && (
        <div style={{
          position: 'absolute', top: -40, right: -20, width: '45%', height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(120,90,140,0.45), transparent 60%)',
          filter: 'blur(2px)',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '3px 3px', mixBlendMode: 'overlay',
      }} />
    </div>
  );
}

// ---- Camera tile (fills grid cell, video centered/letterboxed inside) --

function TileFitted({ tile, isSelected, isSyncSelected, onSelect, onToggleSync, mode, syncMode }) {
  const [hover, setHover] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(null);
  const showOverlay = hover || isSelected;
  const isOffline = tile.status === 'offline';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setScrubPosition(null); }}
      onClick={() => onSelect(tile.id)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: tokens.bgTile,
        overflow: 'hidden',
        cursor: 'pointer',
        outline: isSelected ? `2px solid ${tokens.primary}` : isSyncSelected ? `2px solid ${tokens.aiPurple}` : 'none',
        outlineOffset: -2,
        transition: 'outline 120ms ease',
      }}
    >
      <CameraFrame src={tile.image} name={tile.cameraName} />

      <div style={{
        position: 'absolute', top: 6, left: 6,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 3,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 10.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        }}>{tile.position}</div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          padding: '3px 7px', borderRadius: 3,
          color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
        }}>
          <StatusDot status={mode === 'playback' ? 'recording' : 'online'} size={6} animated />
          {mode === 'playback'
            ? <span style={{ color: '#FF8A8A' }}>REC</span>
            : <span>LIVE</span>}
          {tile.isPTZ && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ color: '#A8C8E8' }}>PTZ</span>
            </>
          )}
        </div>
      </div>

      {mode === 'playback' && syncMode && !isOffline && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSync(tile.id); }}
          style={{
            position: 'absolute', bottom: 6, right: 6,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 7px', borderRadius: 3,
            background: isSyncSelected ? tokens.aiPurple : 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)', border: 'none',
            color: '#fff', cursor: 'pointer', fontSize: 10, fontWeight: 600,
            letterSpacing: 0.4,
          }}
          title={isSyncSelected ? 'Remove from sync' : 'Add to sync playback'}
        >
          <Link2 size={10} strokeWidth={2.5} />
          {isSyncSelected ? 'SYNCED' : 'SYNC'}
        </button>
      )}

      {tile.timestamp && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 10.5, color: 'rgba(255,255,255,0.85)',
          background: 'rgba(0,0,0,0.45)', padding: '3px 7px', borderRadius: 3,
          backdropFilter: 'blur(8px)',
          opacity: showOverlay ? 0 : 1, transition: 'opacity 140ms ease',
        }}>{tile.timestamp}</div>
      )}

      {!isOffline && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          display: 'flex', gap: 1,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          borderRadius: 3, padding: 2,
          opacity: showOverlay ? 1 : 0,
          transform: showOverlay ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity 140ms ease, transform 140ms ease',
          pointerEvents: showOverlay ? 'auto' : 'none',
        }}>
          <IconButton icon={Camera} label="Snapshot" size={13} dark />
          <IconButton icon={Bookmark} label="Bookmark moment" size={13} dark />
          {mode === 'live' && <IconButton icon={Rewind} label="Jump to playback" size={13} dark />}
          {mode === 'playback' && <IconButton icon={Download} label="Export clip" size={13} dark />}
          <IconButton icon={ZoomIn} label="Digital zoom" size={13} dark />
          <IconButton icon={Maximize2} label="Expand tile" size={13} dark />
          <IconButton icon={MoreVertical} label="More" size={13} dark />
        </div>
      )}

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '18px 10px 10px',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7) 50%)',
        color: '#fff',
      }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, letterSpacing: 0.1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{tile.cameraName}</div>
        <div style={{
          fontSize: 10.5, color: 'rgba(255,255,255,0.6)', marginTop: 1,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Folder size={9} strokeWidth={2} />
          {tile.site}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{tile.cameraId}</span>
        </div>
      </div>

      {!isOffline && mode === 'live' && (
        <div
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            setScrubPosition(Math.max(0, Math.min(100, x)));
          }}
          onMouseLeave={() => setScrubPosition(null)}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: 18,
            opacity: showOverlay ? 1 : 0,
            transition: 'opacity 200ms ease',
            cursor: 'ew-resize',
            pointerEvents: showOverlay ? 'auto' : 'none',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div style={{
            position: 'relative', width: '100%', height: 3,
            background: 'rgba(255,255,255,0.15)', margin: '0 6px 3px',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: tile.status === 'recording' ? tokens.recordingGreen : 'transparent',
              opacity: 0.85,
            }} />
            {tile.motion && [22, 41, 58, 71, 84].map((pos) => (
              <div key={pos} style={{
                position: 'absolute', left: `${pos}%`, top: -1, bottom: -1,
                width: 2, background: tokens.warning,
              }} />
            ))}
            <div style={{
              position: 'absolute', right: 0, top: -2, bottom: -2, width: 2,
              background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.8)',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Camera tile (16:9 forced, used in expanded views) ------------------

function CameraTile({ tile, isSelected, isSyncSelected, onSelect, onToggleSync, mode, syncMode }) {
  const [hover, setHover] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(null);
  const showOverlay = hover || isSelected;
  const isOffline = tile.status === 'offline';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setScrubPosition(null); }}
      onClick={() => onSelect(tile.id)}
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        width: '100%',
        background: tokens.bgTile, borderRadius: 4,
        overflow: 'hidden', cursor: 'pointer',
        outline: isSelected ? `2px solid ${tokens.primary}` : isSyncSelected ? `2px solid ${tokens.aiPurple}` : '1px solid rgba(255,255,255,0.04)',
        outlineOffset: (isSelected || isSyncSelected) ? -2 : 0,
        transition: 'outline 120ms ease',
        boxShadow: isSelected ? tokens.shadow2 : 'none',
      }}
    >
      <CameraFrame src={tile.image} name={tile.cameraName} />

      <div style={{
        position: 'absolute', top: 8, left: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        }}>{tile.position}</div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          padding: '4px 8px', borderRadius: 3,
          color: '#fff', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4,
        }}>
          <StatusDot status={mode === 'playback' ? 'recording' : 'online'} size={6} animated />
          {mode === 'playback'
            ? <span style={{ color: '#FF8A8A' }}>REC</span>
            : <span>LIVE</span>}
          {tile.isPTZ && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ color: '#A8C8E8' }}>PTZ</span>
            </>
          )}
        </div>
      </div>

      {mode === 'playback' && syncMode && !isOffline && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSync(tile.id); }}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 3,
            background: isSyncSelected ? tokens.aiPurple : 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)', border: 'none',
            color: '#fff', cursor: 'pointer', fontSize: 10.5, fontWeight: 600,
            letterSpacing: 0.4,
          }}
          title={isSyncSelected ? 'Remove from sync' : 'Add to sync playback'}
        >
          <Link2 size={11} strokeWidth={2.5} />
          {isSyncSelected ? 'SYNCED' : 'SYNC'}
        </button>
      )}

      {tile.timestamp && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 11, color: 'rgba(255,255,255,0.85)',
          background: 'rgba(0,0,0,0.45)', padding: '4px 8px', borderRadius: 3,
          backdropFilter: 'blur(8px)',
          opacity: showOverlay ? 0 : 1, transition: 'opacity 140ms ease',
        }}>{tile.timestamp}</div>
      )}

      {!isOffline && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', gap: 1,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          borderRadius: 3, padding: 2,
          opacity: showOverlay ? 1 : 0,
          transform: showOverlay ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity 140ms ease, transform 140ms ease',
          pointerEvents: showOverlay ? 'auto' : 'none',
        }}>
          <IconButton icon={Camera} label="Snapshot" size={14} dark />
          <IconButton icon={Bookmark} label="Bookmark moment" size={14} dark />
          {mode === 'live' && <IconButton icon={Rewind} label="Jump to playback" size={14} dark />}
          {mode === 'playback' && <IconButton icon={Download} label="Export clip" size={14} dark />}
          <IconButton icon={ZoomIn} label="Digital zoom" size={14} dark />
          <IconButton icon={Maximize2} label="Expand tile" size={14} dark />
          <IconButton icon={MoreVertical} label="More" size={14} dark />
        </div>
      )}

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '20px 12px 14px',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7) 50%)',
        color: '#fff',
      }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600, letterSpacing: 0.1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{tile.cameraName}</div>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Folder size={10} strokeWidth={2} />
          {tile.site}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{tile.cameraId}</span>
        </div>
      </div>

      {!isOffline && mode === 'live' && (
        <div
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            setScrubPosition(Math.max(0, Math.min(100, x)));
          }}
          onMouseLeave={() => setScrubPosition(null)}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: 22,
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.5))',
            opacity: showOverlay ? 1 : 0,
            transition: 'opacity 200ms ease',
            cursor: 'ew-resize',
            pointerEvents: showOverlay ? 'auto' : 'none',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div style={{
            position: 'relative', width: '100%', height: 4,
            background: 'rgba(255,255,255,0.15)', margin: '0 8px 4px',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: tile.status === 'recording' ? tokens.recordingGreen : 'transparent',
              opacity: 0.85,
            }} />
            {tile.motion && [22, 41, 58, 71, 84].map((pos) => (
              <div key={pos} style={{
                position: 'absolute', left: `${pos}%`, top: -1, bottom: -1,
                width: 2, background: tokens.warning,
              }} />
            ))}
            <div style={{
              position: 'absolute', right: 0, top: -3, bottom: -3, width: 2,
              background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.8)',
            }} />
            {scrubPosition !== null && (
              <div style={{
                position: 'absolute', left: `${scrubPosition}%`, top: -8, bottom: -8,
                width: 1, background: '#fff', pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', bottom: 14, left: -22,
                  background: 'rgba(0,0,0,0.85)', color: '#fff',
                  fontSize: 10, padding: '3px 6px', borderRadius: 3,
                  fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
                  backdropFilter: 'blur(8px)',
                }}>-{Math.round((100 - scrubPosition) / 100 * 15)}min</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sites tree row -----------------------------------------------------

function SiteRow({ site, onToggle, compact }) {
  return (
    <div>
      <button onClick={() => onToggle(site.name)} style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: compact ? '6px 10px' : '8px 12px 8px 14px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        gap: 8, color: tokens.textPrimary,
        fontSize: compact ? 12 : 13, fontWeight: 600, borderRadius: 4,
      }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.bgHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <ChevronDown size={12} strokeWidth={2} style={{
          transform: site.expanded ? 'rotate(0)' : 'rotate(-90deg)',
          transition: 'transform 140ms ease', color: tokens.textSecondary, flexShrink: 0,
        }} />
        {!compact && <Folder size={14} strokeWidth={1.8} color={tokens.textSecondary} />}
        <span style={{
          flex: 1, textAlign: 'left', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{site.name}</span>
        <span style={{
          fontSize: 10.5, fontWeight: 500, color: tokens.textHint,
          background: tokens.divider, padding: '1px 6px', borderRadius: 9,
        }}>{site.onlineCount}/{site.cameraCount}</span>
      </button>

      {site.expanded && site.cameras.map((cam, i) => (
        <button key={i} style={{
          display: 'flex', alignItems: 'center', width: '100%',
          padding: compact ? '5px 10px 5px 26px' : '6px 12px 6px 38px',
          background: cam.selected ? tokens.bgSelected : 'transparent',
          border: 'none', cursor: 'pointer', gap: 8,
          color: cam.selected ? tokens.primary : tokens.textPrimary,
          fontSize: compact ? 11.5 : 12.5,
          fontWeight: cam.selected ? 600 : 400,
          borderLeft: cam.selected ? `2px solid ${tokens.primary}` : '2px solid transparent',
          paddingLeft: cam.selected ? (compact ? 24 : 36) : (compact ? 26 : 38),
        }}
          onMouseEnter={(e) => { if (!cam.selected) e.currentTarget.style.background = tokens.bgHover; }}
          onMouseLeave={(e) => { if (!cam.selected) e.currentTarget.style.background = 'transparent'; }}
        >
          {!compact && <Video size={13} strokeWidth={1.6} color={tokens.textSecondary} />}
          <span style={{
            flex: 1, textAlign: 'left', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{cam.name}</span>
          <StatusDot status={cam.status} size={6} animated />
        </button>
      ))}
    </div>
  );
}

// ---- View Mode Toggle (inline icon group used in bottom controls) ------

function ViewModeToggle({ value, onChange, alarmCount, mode }) {
  // In live mode, only show Live controls + Alarms + Hidden (no Timeline)
  // In playback mode, show Timeline + Alarms + Hidden
  const buttons = mode === 'playback' ? [
    { id: 'timeline', icon: Clock, label: 'Show timeline' },
    { id: 'alarms', icon: AlertTriangle, label: 'Show alarms', badge: alarmCount },
    { id: 'hidden', icon: EyeOff, label: 'Hide bottom panel' },
  ] : [
    { id: 'controls', icon: Tv, label: 'Show camera controls' },
    { id: 'alarms', icon: AlertTriangle, label: 'Show alarms', badge: alarmCount },
    { id: 'hidden', icon: EyeOff, label: 'Hide bottom panel' },
  ];

  return (
    <div style={{
      display: 'flex', gap: 1, padding: 2,
      background: tokens.divider, borderRadius: 4,
    }}>
      {buttons.map(btn => (
        <button key={btn.id}
          onClick={() => onChange(btn.id)}
          title={btn.label}
          style={{
            padding: '5px 8px',
            background: value === btn.id ? tokens.bgPanel : 'transparent',
            border: 'none', borderRadius: 3, cursor: 'pointer',
            color: value === btn.id ? tokens.primary : tokens.textSecondary,
            display: 'inline-flex', alignItems: 'center',
            boxShadow: value === btn.id ? tokens.shadow1 : 'none',
            position: 'relative',
          }}>
          <btn.icon size={14} strokeWidth={1.8} />
          {btn.badge > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              background: tokens.recordingRed, color: '#fff',
              fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
              padding: '0 4px', borderRadius: 7,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{btn.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---- The Playback Timeline (v7) ----------------------------------------

function PlaybackTimeline({
  selectedTile, syncMode, syncedTiles, onToggleSyncMode,
  isPlaying, onTogglePlay, playSpeed, onSpeedChange,
  zoomLevel, onZoomChange, currentPosition, onSeek,
  visibleTiles,
  bottomPanelView, onChangeBottomPanel, alarmCount,
}) {
  const timelineRef = useRef(null);
  const [hoverPos, setHoverPos] = useState(null);

  const camerasToShow = syncMode
    ? visibleTiles.filter(t => syncedTiles.includes(t.id) && t.status !== 'offline')
    : [visibleTiles.find(t => t.id === selectedTile)].filter(Boolean).filter(t => t.status !== 'offline');

  const eventTypeColors = {
    alert: tokens.recordingRed,
    ai: tokens.aiPurple,
    motion: tokens.warning,
    bookmark: tokens.bookmarkBlue,
  };

  const handleTimelineClick = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, x)));
  };

  const handleMouseMove = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setHoverPos(Math.max(0, Math.min(100, x)));
  };

  const positionToTime = (pos) => {
    const minutes = Math.round((pos / 100) * 60);
    const startHour = 12, startMin = 25;
    const totalMin = startMin + minutes;
    const hour = startHour + Math.floor(totalMin / 60);
    const min = totalMin % 60;
    const sec = Math.floor(((pos / 100 * 60) % 1) * 60);
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const ZOOM_OPTIONS = ['15m', '1h', '6h', '24h', '7d'];

  const laneCount = syncMode && camerasToShow.length > 1 ? camerasToShow.length : 1;
  const LANE_HEIGHT = 24;
  const trackHeight = laneCount * LANE_HEIGHT;

  return (
    <div style={{
      background: tokens.bgPanel,
      flexShrink: 0,
    }}>
      {/* Timeline track region */}
      <div style={{ padding: '8px 12px 4px' }}>
        {/* Time ruler */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 6,
          fontSize: 10, color: tokens.textHint,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontWeight: 500, letterSpacing: 0.3,
        }}>
          {[0, 10, 20, 30, 40, 50, 60].map(min => {
            const total = 25 + min;
            const h = 12 + Math.floor(total / 60);
            const m = total % 60;
            return <span key={min}>{h}:{m.toString().padStart(2, '0')}</span>;
          })}
        </div>

        {/* Timeline track */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)}
          style={{
            position: 'relative',
            height: trackHeight,
            cursor: 'pointer',
          }}
        >
          {camerasToShow.map((cam, idx) => {
            const gaps = recordingGaps[cam.cameraId] || [];
            const laneTop = idx * LANE_HEIGHT;

            return (
              <div key={cam.cameraId} style={{
                position: 'absolute', left: 0, right: 0,
                top: laneTop, height: LANE_HEIGHT,
              }}>
                {/* Solid 6px green recording bar */}
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  top: '50%', transform: 'translateY(-50%)',
                  height: 6,
                  background: tokens.recordingGreen,
                  borderRadius: 1,
                }} />
                {/* Recording gaps */}
                {gaps.map((gap, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${gap.start}%`, width: `${gap.end - gap.start}%`,
                    top: '50%', transform: 'translateY(-50%)',
                    height: 6,
                    background: tokens.divider,
                    borderRadius: 1,
                  }} />
                ))}
                {/* Camera label in sync mode */}
                {syncMode && camerasToShow.length > 1 && (
                  <div style={{
                    position: 'absolute', left: 4, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 9.5, fontWeight: 600,
                    color: tokens.textHint,
                    background: tokens.bgPanel,
                    padding: '0 4px',
                    fontFamily: 'ui-monospace, monospace',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}>{cam.cameraId}</div>
                )}
              </div>
            );
          })}

          {/* Events */}
          {camerasToShow.flatMap((cam, camIdx) =>
            (timelineEvents[cam.cameraId] || []).map((ev, i) => {
              const laneTop = camIdx * LANE_HEIGHT;
              const lineLength = LANE_HEIGHT - 6;
              const lineTop = laneTop + 3;

              return (
                <div key={`${cam.cameraId}-${i}`}
                  title={`${ev.label || ev.type.toUpperCase()} · ${cam.cameraName} · ${positionToTime(ev.position)}`}
                  style={{
                    position: 'absolute',
                    left: `${ev.position}%`,
                    top: lineTop,
                    height: lineLength,
                    width: 2,
                    background: eventTypeColors[ev.type],
                    transform: 'translateX(-1px)',
                    cursor: 'pointer',
                  }}
                />
              );
            })
          )}

          {hoverPos !== null && (
            <div style={{
              position: 'absolute',
              left: `${hoverPos}%`, top: -4, bottom: -4,
              width: 1, background: tokens.textHint,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: -22, left: -28,
                background: tokens.textPrimary, color: '#fff',
                fontSize: 10.5, padding: '3px 7px', borderRadius: 3,
                fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
                fontWeight: 600,
                boxShadow: tokens.shadow2,
              }}>{positionToTime(hoverPos)}</div>
            </div>
          )}

          <div style={{
            position: 'absolute',
            left: `${currentPosition}%`, top: -6, bottom: -6,
            width: 1, background: tokens.primary,
            pointerEvents: 'none', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', top: -1, left: -4,
              width: 9, height: 7,
              background: tokens.primary,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }} />
            <div style={{
              position: 'absolute', bottom: -1, left: -4,
              width: 9, height: 7,
              background: tokens.primary,
              clipPath: 'polygon(0 100%, 100% 100%, 50% 0)',
            }} />
          </div>
        </div>
      </div>

      {/* Merged controls row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px 8px',
        flexWrap: 'wrap',
      }}>
        {/* View mode toggle — leftmost group */}
        <ViewModeToggle
          value={bottomPanelView}
          onChange={onChangeBottomPanel}
          alarmCount={alarmCount}
          mode="playback"
        />

        <div style={{ width: 1, height: 20, background: tokens.border }} />

        {/* Date + time */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Calendar size={13} color={tokens.textSecondary} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: tokens.textSecondary, fontWeight: 500 }}>
              Sun, Apr 26, 2026
            </span>
            <span style={{
              fontSize: 14, fontWeight: 700,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              color: tokens.textPrimary,
              letterSpacing: 0.3,
            }}>
              {positionToTime(currentPosition)}
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 20, background: tokens.border }} />

        {/* Transport controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton icon={SkipBack} label="Skip backward 1 min" size={14} />
          <IconButton icon={Rewind} label="Step back 1 frame" size={14} />
          <button onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'} style={{
            width: 32, height: 32, borderRadius: 4,
            background: tokens.primary,
            border: 'none', cursor: 'pointer',
            color: '#fff', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 2px', boxShadow: tokens.shadow1,
          }}>
            {isPlaying ? <Pause size={14} strokeWidth={2.5} fill="#fff" /> : <Play size={14} strokeWidth={2.5} fill="#fff" style={{ marginLeft: 1 }} />}
          </button>
          <button title="Step forward 1 frame" style={{
            background: 'transparent', border: 'none', borderRadius: 4,
            padding: 6, cursor: 'pointer', color: tokens.textSecondary,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rewind size={14} strokeWidth={1.8} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <IconButton icon={SkipForward} label="Skip forward 1 min" size={14} />
        </div>

        {/* Speed */}
        <div style={{
          display: 'flex', gap: 1, padding: 2,
          background: tokens.divider, borderRadius: 4,
        }}>
          {['0.5x', '1x', '2x', '4x', '8x'].map(s => (
            <button key={s} onClick={() => onSpeedChange(s)} style={{
              padding: '4px 7px',
              background: playSpeed === s ? tokens.bgPanel : 'transparent',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              color: playSpeed === s ? tokens.textPrimary : tokens.textSecondary,
              fontSize: 11, fontWeight: 600,
              fontFamily: 'ui-monospace, monospace',
              boxShadow: playSpeed === s ? tokens.shadow1 : 'none',
            }}>{s}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          fontSize: 12, color: tokens.textSecondary, fontWeight: 500,
        }}>
          {syncMode
            ? `${camerasToShow.length} cameras synced`
            : camerasToShow[0]?.cameraName || 'No camera selected'
          }
        </div>

        <button
          onClick={onToggleSyncMode}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            background: syncMode ? tokens.aiPurple : 'transparent',
            border: `1px solid ${syncMode ? tokens.aiPurple : tokens.border}`,
            borderRadius: 4, cursor: 'pointer',
            color: syncMode ? '#fff' : tokens.textSecondary,
            fontSize: 11, fontWeight: 600,
            letterSpacing: 0.2,
          }}
          title="Synchronize playback across multiple cameras"
        >
          <Link2 size={12} strokeWidth={2.2} />
          SYNC{syncMode && ` · ${syncedTiles.length}`}
        </button>

        <div style={{
          display: 'flex', gap: 1, padding: 2,
          background: tokens.divider, borderRadius: 4,
        }}>
          {ZOOM_OPTIONS.map(z => (
            <button key={z} onClick={() => onZoomChange(z)} style={{
              padding: '4px 7px',
              background: zoomLevel === z ? tokens.bgPanel : 'transparent',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              color: zoomLevel === z ? tokens.textPrimary : tokens.textSecondary,
              fontSize: 11, fontWeight: 600,
              boxShadow: zoomLevel === z ? tokens.shadow1 : 'none',
            }}>{z}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Live Mode Compact Controls Bar ------------------------------------

function LiveControlsBar({ bottomPanelView, onChangeBottomPanel, alarmCount, selectedTile, visibleTiles }) {
  const selectedCam = visibleTiles.find(t => t.id === selectedTile);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  return (
    <div style={{
      background: tokens.bgPanel,
      flexShrink: 0,
      padding: '6px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
      flexWrap: 'wrap',
    }}>
      {/* View mode toggle — leftmost */}
      <ViewModeToggle
        value={bottomPanelView}
        onChange={onChangeBottomPanel}
        alarmCount={alarmCount}
        mode="live"
      />

      <div style={{ width: 1, height: 20, background: tokens.border }} />

      {/* Selected camera context */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: tokens.textSecondary,
      }}>
        <Video size={13} />
        <span style={{ fontWeight: 600, color: tokens.textPrimary }}>
          {selectedCam?.cameraName || '—'}
        </span>
        {selectedCam && (
          <>
            <span style={{ color: tokens.textHint }}>·</span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
              {selectedCam.cameraId}
            </span>
          </>
        )}
      </div>

      <div style={{ width: 1, height: 20, background: tokens.border }} />

      {/* Selected camera quick actions */}
      <div style={{ display: 'flex', gap: 2 }}>
        <IconButton icon={Camera} label="Snapshot from selected camera" />
        <IconButton icon={Bookmark} label="Bookmark current moment" />
        <IconButton icon={Rewind} label="Jump to playback for this camera" />
        <IconButton
          icon={audioEnabled ? Volume2 : VolumeX}
          label={audioEnabled ? 'Mute audio' : 'Unmute audio'}
          onClick={() => setAudioEnabled(!audioEnabled)}
          active={audioEnabled}
        />
        <IconButton
          icon={micEnabled ? Mic : MicOff}
          label={micEnabled ? 'Stop talkback' : 'Start talkback'}
          onClick={() => setMicEnabled(!micEnabled)}
          active={micEnabled}
        />
      </div>

      <div style={{ width: 1, height: 20, background: tokens.border }} />

      {/* All cameras / grid actions */}
      <div style={{
        fontSize: 11, color: tokens.textHint,
        textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600,
      }}>
        All visible
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <IconButton icon={Camera} label="Snapshot all visible cameras" />
        <IconButton icon={RotateCcw} label="Refresh all streams" />
        <IconButton icon={ScreenShare} label="Cast grid to display" />
      </div>

      <div style={{ flex: 1 }} />

      {/* Live grid status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 11.5, color: tokens.textSecondary,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: tokens.liveGreenBright,
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontWeight: 600 }}>3 live</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: tokens.recordingRed,
          }} />
          <span style={{ fontWeight: 600, color: tokens.recordingRed }}>3 rec</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: tokens.offline,
          }} />
          <span style={{ fontWeight: 600 }}>1 offline</span>
        </div>
        <div style={{
          width: 1, height: 14, background: tokens.border,
        }} />
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 11.5,
          color: tokens.textPrimary, fontWeight: 600,
        }}>
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
      </div>
    </div>
  );
}

// ---- Alarm List ---------------------------------------------------------

function AlarmList({
  bottomPanelView, onChangeBottomPanel, alarmCount,
  onJumpTo, onSelectCamera, mode,
}) {
  const [filter, setFilter] = useState('all');

  const filteredAlarms = filter === 'all' ? alarms : alarms.filter(a => a.status === filter);

  const severityConfig = {
    critical: { color: tokens.recordingRed, label: 'CRITICAL' },
    high: { color: tokens.warning, label: 'HIGH' },
    medium: { color: tokens.aiPurple, label: 'MEDIUM' },
    low: { color: tokens.textHint, label: 'LOW' },
  };

  return (
    <div style={{
      background: tokens.bgPanel,
      flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Alarm list filter row + view toggle */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${tokens.divider}`,
      }}>
        <ViewModeToggle
          value={bottomPanelView}
          onChange={onChangeBottomPanel}
          alarmCount={alarmCount}
          mode={mode}
        />

        <div style={{ width: 1, height: 20, background: tokens.border }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: tokens.textPrimary,
        }}>
          <AlertTriangle size={13} color={tokens.warning} />
          {alarms.filter(a => a.status === 'new').length} new alarms
          <span style={{ color: tokens.textHint, fontWeight: 500, marginLeft: 4 }}>
            · {alarms.length} total
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          display: 'flex', gap: 1, padding: 2,
          background: tokens.divider, borderRadius: 4,
        }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'new', label: 'New' },
            { id: 'acknowledged', label: 'Acknowledged' },
            { id: 'resolved', label: 'Resolved' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '4px 10px',
              background: filter === f.id ? tokens.bgPanel : 'transparent',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              color: filter === f.id ? tokens.textPrimary : tokens.textSecondary,
              fontSize: 11, fontWeight: 600,
              boxShadow: filter === f.id ? tokens.shadow1 : 'none',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{
        maxHeight: 240,
        overflowY: 'auto',
      }}>
        {filteredAlarms.length === 0 ? (
          <div style={{
            padding: 32, textAlign: 'center',
            color: tokens.textHint, fontSize: 12,
          }}>
            No alarms in this category
          </div>
        ) : filteredAlarms.map((alarm, i) => {
          const sev = severityConfig[alarm.severity];
          const isNew = alarm.status === 'new';
          return (
            <div key={alarm.id}
              onClick={() => onSelectCamera?.(alarm.cameraId)}
              style={{
                padding: '10px 16px',
                borderBottom: i < filteredAlarms.length - 1 ? `1px solid ${tokens.divider}` : 'none',
                borderLeft: `3px solid ${sev.color}`,
                background: isNew ? 'rgba(211, 47, 47, 0.02)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = tokens.bgHover}
              onMouseLeave={(e) => e.currentTarget.style.background = isNew ? 'rgba(211, 47, 47, 0.02)' : 'transparent'}
            >
              <div style={{
                padding: '3px 6px',
                background: sev.color,
                color: '#fff',
                fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5,
                borderRadius: 2,
                fontFamily: 'ui-monospace, monospace',
                flexShrink: 0,
                minWidth: 60, textAlign: 'center',
              }}>
                {sev.label}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: tokens.textPrimary,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {alarm.title}
                  {isNew && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: tokens.recordingRed,
                      animation: 'pulse 2s infinite',
                    }} />
                  )}
                </div>
                <div style={{
                  fontSize: 11, color: tokens.textSecondary,
                  marginTop: 2, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Video size={10} />
                  {alarm.cameraName}
                  <span style={{ color: tokens.textHint }}>·</span>
                  <Folder size={10} />
                  {alarm.site}
                  <span style={{ color: tokens.textHint }}>·</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{alarm.cameraId}</span>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                flexShrink: 0,
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 600,
                    fontFamily: 'ui-monospace, monospace',
                    color: tokens.textPrimary,
                  }}>{alarm.timestamp}</div>
                  <div style={{
                    fontSize: 10.5, color: tokens.textHint,
                    marginTop: 2,
                  }}>{alarm.timeAgo}</div>
                </div>

                <div style={{
                  padding: '3px 8px',
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
                  background: alarm.status === 'new' ? tokens.recordingRed : alarm.status === 'acknowledged' ? tokens.warning : tokens.liveGreen,
                  color: '#fff', borderRadius: 2,
                  textTransform: 'uppercase',
                  fontFamily: 'ui-monospace, monospace',
                  minWidth: 50, textAlign: 'center',
                }}>
                  {alarm.status}
                </div>

                <button style={{
                  background: 'transparent',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 4, padding: '5px 10px',
                  fontSize: 11, fontWeight: 500,
                  color: tokens.textPrimary, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  View <ArrowRight size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Hidden Strip (when bottom panel is hidden) -------------------------

function HiddenStrip({ bottomPanelView, onChangeBottomPanel, alarmCount, mode }) {
  return (
    <div style={{
      background: tokens.bgPanel,
      padding: '6px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      flexShrink: 0,
    }}>
      <ViewModeToggle
        value={bottomPanelView}
        onChange={onChangeBottomPanel}
        alarmCount={alarmCount}
        mode={mode}
      />
      <div style={{
        fontSize: 11, color: tokens.textHint,
        fontStyle: 'italic',
      }}>
        Bottom panel hidden — click an icon above to show
      </div>
    </div>
  );
}

// ---- Main component -----------------------------------------------------

export default function DC3Monitoring() {
  const viewportWidth = useViewportWidth();
  const [siteState, setSiteState] = useState(sites);
  const [selectedTile, setSelectedTile] = useState(1);
  const [mode, setMode] = useState('playback');

  const [layoutPanelOpen, setLayoutPanelOpen] = useState(viewportWidth >= 1366);
  const [sitesPanelCompact, setSitesPanelCompact] = useState(viewportWidth < 1600);

  // Bottom panel view: 'timeline' | 'alarms' | 'hidden' (in playback)
  //                   'controls' | 'alarms' | 'hidden' (in live)
  const [bottomPanelPlayback, setBottomPanelPlayback] = useState('timeline');
  const [bottomPanelLive, setBottomPanelLive] = useState('controls');

  const bottomPanelView = mode === 'playback' ? bottomPanelPlayback : bottomPanelLive;
  const setBottomPanelView = mode === 'playback' ? setBottomPanelPlayback : setBottomPanelLive;

  useEffect(() => {
    if (viewportWidth < 1280) {
      setLayoutPanelOpen(false);
    } else if (viewportWidth < 1512) {
      setSitesPanelCompact(true);
      setLayoutPanelOpen(true);
    } else if (viewportWidth < 1600) {
      setSitesPanelCompact(true);
      setLayoutPanelOpen(true);
    } else {
      setSitesPanelCompact(false);
      setLayoutPanelOpen(true);
    }
  }, [viewportWidth >= 1280, viewportWidth >= 1512, viewportWidth >= 1600]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState('1x');
  const [zoomLevel, setZoomLevel] = useState('1h');
  const [currentPosition, setCurrentPosition] = useState(48);
  const [syncMode, setSyncMode] = useState(false);
  const [syncedTiles, setSyncedTiles] = useState([1]);

  const toggleSite = (name) => {
    setSiteState((prev) => prev.map((s) => (s.name === name ? { ...s, expanded: !s.expanded } : s)));
  };

  const handleToggleSyncMode = () => {
    if (!syncMode) {
      setSyncMode(true);
      setSyncedTiles([selectedTile]);
    } else {
      setSyncMode(false);
      setSyncedTiles([selectedTile]);
    }
  };

  const handleToggleSyncTile = (tileId) => {
    setSyncedTiles(prev =>
      prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]
    );
  };

  const isCompactViewport = viewportWidth < 1366;
  const leftRailWidth = 64;
  const sitesPanelWidth = sitesPanelCompact ? 180 : 240;
  const topbarSearchWidth = viewportWidth < 1366 ? 180 : viewportWidth < 1600 ? 220 : 280;

  const newAlarmCount = alarms.filter(a => a.status === 'new').length;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: tokens.bgApp,
      fontFamily: '"OctaveDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: tokens.textPrimary, fontSize: 13, overflow: 'hidden',
    }}>
      <style>{`
        @font-face {
          font-family: 'OctaveDisplay';
          src: url('${octaveFontUrl}') format('opentype');
          font-weight: 400;
          font-style: normal;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      {/* Topbar */}
      <header style={{
        height: 42,
        background: tokens.bgTopbar,
        display: 'flex', alignItems: 'center',
        paddingLeft: 10, paddingRight: 10,
        flexShrink: 0, color: '#fff', gap: 10,
        boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={octaveLogoWhite} alt="Octave" style={{ height: 22 }} />
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.2)', marginLeft: 8 }} />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            Coda Video Cloud
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.12)', borderRadius: 4,
          padding: '6px 10px', width: topbarSearchWidth, gap: 8,
          transition: 'width 200ms ease',
        }}>
          <Search size={14} strokeWidth={1.8} color="rgba(255,255,255,0.7)" />
          <input placeholder={viewportWidth < 1366 ? 'Search…' : 'Search cameras, sites, events…'} style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 12.5, flex: 1,
          }} />
          {viewportWidth >= 1366 && (
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.5)',
              padding: '1px 5px', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 3,
            }}>⌘K</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <IconButton icon={Bell} label="Alerts" dark badge={newAlarmCount} />
          <IconButton icon={HelpCircle} label="Help" dark />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#43A047',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>SM</div>
          {viewportWidth >= 1280 && (
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Sunil Mudholkar</div>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left rail */}
        <nav style={{
          width: leftRailWidth, background: tokens.bgPanel,
          borderRight: `1px solid ${tokens.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 12, gap: 4, flexShrink: 0,
          transition: 'width 200ms ease',
        }}>
          {[
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: Monitor, label: 'Monitoring', active: true },
            { icon: ShieldCheck, label: 'Health' },
            { icon: Bell, label: 'Alerts', badge: newAlarmCount },
            { icon: Search, label: 'Search' },
            { icon: Archive, label: 'Archive' },
          ].map((item, i) => (
            <button key={i} style={{
              width: leftRailWidth - 16, height: leftRailWidth - 16,
              background: item.active ? tokens.primaryLight : 'transparent',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3,
              color: item.active ? tokens.primary : tokens.textSecondary,
              position: 'relative',
            }}
              onMouseEnter={(e) => { if (!item.active) e.currentTarget.style.background = tokens.bgHover; }}
              onMouseLeave={(e) => { if (!item.active) e.currentTarget.style.background = 'transparent'; }}
            >
              <item.icon size={isCompactViewport ? 16 : 18} strokeWidth={1.7} />
              <span style={{ fontSize: isCompactViewport ? 9 : 10, fontWeight: 500 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  position: 'absolute', top: 8, right: 14,
                  background: tokens.recordingRed, color: '#fff',
                  fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
                  padding: '0 4px', borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{item.badge}</span>
              )}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <button style={{
            width: leftRailWidth - 16, height: leftRailWidth - 16,
            background: 'transparent', border: 'none',
            borderRadius: 6, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3,
            color: tokens.textSecondary, marginBottom: 12,
          }}>
            <Settings size={isCompactViewport ? 16 : 18} strokeWidth={1.7} />
            <span style={{ fontSize: isCompactViewport ? 9 : 10, fontWeight: 500 }}>Settings</span>
          </button>
        </nav>

        {/* Sites panel */}
        {layoutPanelOpen && (
          <aside style={{
            width: sitesPanelWidth,
            background: tokens.bgPanel,
            borderRight: `1px solid ${tokens.border}`,
            display: 'flex', flexDirection: 'column', flexShrink: 0,
            transition: 'width 200ms ease',
          }}>
            <div style={{
              padding: '8px 10px 6px',
              borderBottom: `1px solid ${tokens.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2,
                color: tokens.textHint, fontWeight: 600, flex: 1,
              }}>Camera library</div>
              <IconButton
                icon={sitesPanelCompact ? PanelLeftOpen : PanelLeftClose}
                label={sitesPanelCompact ? 'Expand panel' : 'Compact panel'}
                onClick={() => setSitesPanelCompact(!sitesPanelCompact)}
              />
            </div>

            {!sitesPanelCompact && (
              <div style={{ padding: '8px 14px 6px' }}>
                <div style={{
                  display: 'flex', gap: 4, background: tokens.divider,
                  padding: 3, borderRadius: 5,
                }}>
                  {['Sites', 'Layouts', 'Map'].map((tab, i) => (
                    <button key={tab} style={{
                      flex: 1, padding: '6px 10px',
                      background: i === 0 ? tokens.bgPanel : 'transparent',
                      border: 'none', borderRadius: 3, cursor: 'pointer',
                      fontSize: 12, fontWeight: i === 0 ? 600 : 500,
                      color: i === 0 ? tokens.textPrimary : tokens.textSecondary,
                      boxShadow: i === 0 ? tokens.shadow1 : 'none',
                    }}>{tab}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              padding: sitesPanelCompact ? '8px 10px' : '0px 12px 8px',
              display: 'flex', gap: 6,
            }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                background: tokens.bgApp, border: `1px solid ${tokens.border}`,
                borderRadius: 4, padding: sitesPanelCompact ? '5px 8px' : '6px 10px',
              }}>
                <Search size={12} color={tokens.textHint} />
                <input placeholder="Search…" style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  flex: 1, fontSize: 12, color: tokens.textPrimary,
                }} />
              </div>
              {!sitesPanelCompact && <IconButton icon={Filter} label="Filter" />}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 4px 12px' }}>
              {siteState.map((site) => (
                <SiteRow key={site.name} site={site} onToggle={toggleSite} compact={sitesPanelCompact} />
              ))}
            </div>

            <div style={{
              padding: sitesPanelCompact ? '8px 12px' : '10px 16px',
              borderTop: `1px solid ${tokens.border}`,
              fontSize: 10.5, color: tokens.textHint,
              display: 'flex', justifyContent: 'space-between',
              flexDirection: sitesPanelCompact ? 'column' : 'row',
              gap: sitesPanelCompact ? 2 : 0,
            }}>
              <span>43 cams · 37 online</span>
              <span style={{ color: tokens.recordingRed, fontWeight: 600 }}>● 12 recording</span>
            </div>
          </aside>
        )}

        {/* Main */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          minWidth: 0, background: tokens.bgApp,
        }}>
          {/* Workspace toolbar — no longer has the bottom panel toggle */}
          <div style={{
            background: tokens.bgPanel, borderBottom: `1px solid ${tokens.border}`,
            padding: '6px 12px', display: 'flex', alignItems: 'center',
            gap: 10, flexShrink: 0,
          }}>
            <button onClick={() => setLayoutPanelOpen(!layoutPanelOpen)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: tokens.textSecondary,
              display: 'flex', alignItems: 'center',
            }}>
              {layoutPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ color: tokens.textHint, fontWeight: 500 }}>Workspace</span>
              <ChevronRight size={12} color={tokens.textHint} />
              <span>2x2 Grid · Mixed sites</span>
            </div>

            {viewportWidth >= 1366 && (
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: `1px solid ${tokens.border}`,
                borderRadius: 4, padding: '5px 10px',
                fontSize: 12, color: tokens.textPrimary, cursor: 'pointer', fontWeight: 500,
              }}>
                <Plus size={13} />Save layout
              </button>
            )}

            <div style={{ flex: 1 }} />

            <div style={{
              display: 'flex', gap: 2, padding: 2,
              background: tokens.divider, borderRadius: 4,
            }}>
              <IconButton icon={Grid3x3} label="Grid layout" active />
              <IconButton icon={Tv} label="Single view" />
              <IconButton icon={Map} label="Map view" />
            </div>

            <div style={{ display: 'flex', gap: 2 }}>
              <IconButton icon={Eye} label="Tour mode" />
              <IconButton icon={Maximize2} label="Fullscreen" />
            </div>

            <div style={{ width: 1, height: 20, background: tokens.border, margin: '0 4px' }} />

            {/* Mode toggle */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: tokens.divider, padding: 3, borderRadius: 5, gap: 2,
            }}>
              <button onClick={() => setMode('live')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                background: mode === 'live' ? tokens.bgPanel : 'transparent',
                border: 'none', borderRadius: 3, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                color: mode === 'live' ? tokens.liveGreen : tokens.textSecondary,
                boxShadow: mode === 'live' ? tokens.shadow1 : 'none',
                transition: 'all 140ms ease',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: mode === 'live' ? tokens.liveGreenBright : tokens.offline,
                  animation: mode === 'live' ? 'pulse 2s infinite' : 'none',
                }} />
                LIVE
              </button>
              <button onClick={() => setMode('playback')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                background: mode === 'playback' ? tokens.bgPanel : 'transparent',
                border: 'none', borderRadius: 3, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                color: mode === 'playback' ? tokens.textPrimary : tokens.textSecondary,
                boxShadow: mode === 'playback' ? tokens.shadow1 : 'none',
                transition: 'all 140ms ease',
              }}>
                <Clock size={12} />PLAYBACK
              </button>
            </div>
          </div>

          {/* Tile grid */}
          <div style={{
            flex: 1,
            background: '#000',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 0,
            padding: 0,
            minHeight: 0,
            overflow: 'hidden',
          }}>
            {tiles.map((tile) => (
              <TileFitted
                key={tile.id}
                tile={tile}
                isSelected={selectedTile === tile.id}
                isSyncSelected={syncMode && syncedTiles.includes(tile.id) && selectedTile !== tile.id}
                onSelect={setSelectedTile}
                onToggleSync={handleToggleSyncTile}
                mode={mode}
                syncMode={syncMode}
              />
            ))}
          </div>

          {/* Bottom panel */}
          {bottomPanelView === 'hidden' && (
            <div style={{ borderTop: `1px solid ${tokens.border}` }}>
              <HiddenStrip
                bottomPanelView={bottomPanelView}
                onChangeBottomPanel={setBottomPanelView}
                alarmCount={newAlarmCount}
                mode={mode}
              />
            </div>
          )}

          {bottomPanelView === 'timeline' && mode === 'playback' && (
            <div style={{ borderTop: `1px solid ${tokens.border}` }}>
              <PlaybackTimeline
                selectedTile={selectedTile}
                syncMode={syncMode}
                syncedTiles={syncedTiles}
                onToggleSyncMode={handleToggleSyncMode}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                playSpeed={playSpeed}
                onSpeedChange={setPlaySpeed}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
                currentPosition={currentPosition}
                onSeek={setCurrentPosition}
                visibleTiles={tiles}
                bottomPanelView={bottomPanelView}
                onChangeBottomPanel={setBottomPanelView}
                alarmCount={newAlarmCount}
              />
            </div>
          )}

          {bottomPanelView === 'controls' && mode === 'live' && (
            <div style={{ borderTop: `1px solid ${tokens.border}` }}>
              <LiveControlsBar
                bottomPanelView={bottomPanelView}
                onChangeBottomPanel={setBottomPanelView}
                alarmCount={newAlarmCount}
                selectedTile={selectedTile}
                visibleTiles={tiles}
              />
            </div>
          )}

          {bottomPanelView === 'alarms' && (
            <div style={{ borderTop: `1px solid ${tokens.border}` }}>
              <AlarmList
                bottomPanelView={bottomPanelView}
                onChangeBottomPanel={setBottomPanelView}
                alarmCount={newAlarmCount}
                onSelectCamera={(camId) => console.log('Jump to', camId)}
                mode={mode}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}