import React, { useState } from 'react';
import {
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  Bell,
  Search,
  Archive,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Video,
  Camera,
  Bookmark,
  Maximize2,
  Minimize2,
  MoreVertical,
  Plus,
  RefreshCw,
  Grid3x3,
  Map,
  Tv,
  Circle,
  Pause,
  Play,
  AlertCircle,
  WifiOff,
  Volume2,
  VolumeX,
  Download,
  Rewind,
  ZoomIn,
  Activity,
  Eye,
  Filter,
  Clock,
  X,
  Check,
} from 'lucide-react';

// ---- Octave-aligned tokens ----------------------------------------------
// These mirror the UXT/Octave palette shipped in the project (light theme,
// blue primary). Kept as constants so theming stays centralized.
const tokens = {
  // surfaces
  bgApp: '#F4F6F8',        // page background
  bgPanel: '#FFFFFF',      // cards / side panels
  bgSidebar: '#F8F9FA',    // left rail
  bgTopbar: '#1B5FA8',     // Hexagon blue topbar
  bgTile: '#0F1419',       // video tile background (off / loading)
  bgHover: 'rgba(15, 20, 25, 0.04)',
  bgSelected: '#E3F2FD',

  // text
  textPrimary: '#1A1F26',
  textSecondary: '#5A6470',
  textHint: '#8A95A0',
  textOnDark: '#FFFFFF',
  textLink: '#1976D2',

  // brand / status
  primary: '#1976D2',
  primaryHover: '#1565C0',
  primaryLight: '#E3F2FD',
  liveGreen: '#2E7D32',
  liveGreenBright: '#43A047',
  recordingRed: '#D32F2F',
  warning: '#F57C00',
  offline: '#9E9E9E',

  // borders
  border: '#E0E4E8',
  borderStrong: '#C8CED4',
  divider: '#EEF1F4',

  // shadow
  shadow1: '0 1px 2px rgba(15, 20, 25, 0.04), 0 1px 3px rgba(15, 20, 25, 0.06)',
  shadow2: '0 2px 4px rgba(15, 20, 25, 0.06), 0 4px 12px rgba(15, 20, 25, 0.08)',
  shadow3: '0 4px 8px rgba(15, 20, 25, 0.08), 0 8px 24px rgba(15, 20, 25, 0.12)',
};

// ---- Mock data ----------------------------------------------------------
const sites = [
  {
    name: 'BBT City Airport',
    expanded: true,
    cameraCount: 7,
    onlineCount: 5,
    cameras: [
      { name: 'Taxi lane 12', status: 'recording' },
      { name: 'Gate B15 external', status: 'recording' },
      { name: 'Gate 27', status: 'online' },
      { name: 'Terminal A', status: 'online' },
      { name: 'Airport drop-off', status: 'recording' },
      { name: 'Gate C07', status: 'offline' },
      { name: 'Gate B03 external', status: 'offline' },
    ],
  },
  {
    name: 'Department Store',
    expanded: false,
    cameraCount: 12,
    onlineCount: 12,
    cameras: [],
  },
  {
    name: 'Downtown',
    expanded: false,
    cameraCount: 8,
    onlineCount: 7,
    cameras: [],
  },
  {
    name: 'Eaton Centre',
    expanded: true,
    cameraCount: 5,
    onlineCount: 4,
    cameras: [
      { name: 'Mall Main', status: 'recording' },
      { name: 'Mall warehouse', status: 'online' },
      { name: 'Brendy Shop', status: 'online' },
      { name: 'Mall Entry', status: 'recording' },
    ],
  },
  {
    name: 'Toronto Office',
    expanded: true,
    cameraCount: 11,
    onlineCount: 9,
    cameras: [
      { name: 'Office 103-105', status: 'online' },
      { name: 'Main Road', status: 'recording' },
      { name: 'Office 1', status: 'online' },
      { name: 'Office 3', status: 'online' },
      { name: 'Suppliers entrance PTZ', status: 'recording' },
      { name: 'Camera floor 2', status: 'online' },
      { name: 'South Parking', status: 'recording', selected: true },
      { name: 'Lab', status: 'online' },
      { name: 'Hanwha QNV-8010R', status: 'recording' },
    ],
  },
];

const tiles = [
  {
    id: 1,
    cameraName: 'South Parking',
    site: 'Toronto Office',
    status: 'recording',
    timestamp: '13:24:56',
    motion: true,
    bitrate: '4.2 Mbps',
    fps: 30,
    isPTZ: false,
    isPrimary: true,
    image: 'parking',
  },
  {
    id: 2,
    cameraName: 'IL HQ Entrance A',
    site: 'IL office',
    status: 'recording',
    timestamp: '13:24:55',
    motion: false,
    bitrate: '2.8 Mbps',
    fps: 25,
    isPTZ: true,
    isPrimary: false,
    image: 'entrance',
  },
  {
    id: 3,
    cameraName: 'IL HQ Augustin',
    site: 'IL office',
    status: 'online',
    timestamp: '13:24:54',
    motion: true,
    bitrate: '3.1 Mbps',
    fps: 30,
    isPTZ: false,
    isPrimary: false,
    image: 'augustin',
  },
  {
    id: 4,
    cameraName: 'Gate C07',
    site: 'BBT City Airport',
    status: 'offline',
    timestamp: null,
    offlineSince: '12:45',
    motion: false,
    isPTZ: false,
    isPrimary: false,
    image: 'offline',
  },
];

// ---- Reusable presentational pieces -------------------------------------

function StatusDot({ status, size = 8, animated = false }) {
  const colorMap = {
    recording: tokens.recordingRed,
    online: tokens.liveGreenBright,
    offline: tokens.offline,
    warning: tokens.warning,
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: colorMap[status] || tokens.offline,
        flexShrink: 0,
        boxShadow:
          status === 'recording'
            ? `0 0 0 2px rgba(211, 47, 47, 0.15)`
            : 'none',
        animation:
          animated && status === 'recording' ? 'pulse 2s infinite' : 'none',
      }}
    />
  );
}

function IconButton({ icon: Icon, label, onClick, active, size = 16, dark = false }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      aria-label={label}
      style={{
        background: active
          ? dark
            ? 'rgba(255,255,255,0.18)'
            : tokens.primaryLight
          : hover
          ? dark
            ? 'rgba(255,255,255,0.10)'
            : tokens.bgHover
          : 'transparent',
        border: 'none',
        borderRadius: 4,
        padding: 6,
        cursor: 'pointer',
        color: active
          ? dark
            ? '#fff'
            : tokens.primary
          : dark
          ? 'rgba(255,255,255,0.85)'
          : tokens.textSecondary,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      <Icon size={size} strokeWidth={1.8} />
    </button>
  );
}

// Faux camera image — gradient blocks that read as parking lot / entrance / etc.
// Better than placeholder boxes; reads as "real" footage at thumbnail size.
function FauxFrame({ kind }) {
  if (kind === 'offline') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0d12',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <WifiOff size={28} color="#5A6470" strokeWidth={1.5} />
        <div style={{ color: '#8A95A0', fontSize: 12, fontWeight: 500 }}>
          Camera offline
        </div>
        <div style={{ color: '#5A6470', fontSize: 11 }}>since 12:45 today</div>
        <button
          style={{
            marginTop: 6,
            background: 'transparent',
            border: '1px solid #2A323C',
            color: '#A8B0BC',
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <RefreshCw size={11} />
          Retry
        </button>
      </div>
    );
  }

  const palettes = {
    parking: {
      sky: 'linear-gradient(180deg, #c5d4e0 0%, #a8b8c5 35%, #6b7585 100%)',
      buildings: '#3a4450',
      cars: '#1f262e',
    },
    entrance: {
      sky: 'linear-gradient(180deg, #2a3038 0%, #1a1f26 100%)',
      buildings: '#454d57',
      cars: '#2a3038',
    },
    augustin: {
      sky: 'linear-gradient(180deg, #8a8a8a 0%, #5a5a5a 100%)',
      buildings: '#3a3a3a',
      cars: '#1a1a1a',
    },
  };

  const p = palettes[kind] || palettes.parking;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Sky / upper area */}
      <div style={{ position: 'absolute', inset: 0, background: p.sky }} />

      {/* Mid distance buildings */}
      {kind === 'parking' && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '40%',
              height: '20%',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.15))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '5%',
              right: '5%',
              bottom: '40%',
              height: '15%',
              background: p.buildings,
              opacity: 0.6,
              clipPath: 'polygon(0 100%, 8% 60%, 18% 70%, 28% 40%, 42% 55%, 55% 30%, 70% 50%, 85% 35%, 100% 60%, 100% 100%)',
            }}
          />
          {/* Parked cars rows */}
          {[0.45, 0.6, 0.75].map((bottom, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${bottom * 100}%`,
                height: '8%',
                background: `repeating-linear-gradient(90deg, ${p.cars} 0 18px, transparent 18px 22px)`,
                opacity: 0.7 - i * 0.15,
              }}
            />
          ))}
          {/* Foreground cable / lens hood */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -20,
              width: '45%',
              height: '70%',
              background: 'radial-gradient(ellipse at center, rgba(120,90,140,0.45), transparent 60%)',
              filter: 'blur(2px)',
            }}
          />
        </>
      )}

      {kind === 'entrance' && (
        <>
          <div
            style={{
              position: 'absolute',
              left: '15%',
              top: '20%',
              width: '40%',
              height: '60%',
              background: 'linear-gradient(180deg, #d4d8dc 0%, #a8aeb5 100%)',
              opacity: 0.6,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '20%',
              top: '35%',
              width: '8%',
              height: '8%',
              background: '#1a1f26',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '30%',
              top: '35%',
              width: '8%',
              height: '8%',
              background: '#1a1f26',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '20%',
              top: '47%',
              width: '8%',
              height: '8%',
              background: '#1a1f26',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '30%',
              top: '47%',
              width: '8%',
              height: '8%',
              background: '#1a1f26',
              borderRadius: 2,
            }}
          />
        </>
      )}

      {kind === 'augustin' && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, #6a6a6a 0%, #2a2a2a 80%)',
            }}
          />
        </>
      )}

      {/* subtle noise overlay so it doesn't read as clean gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}

function CameraTile({ tile, isSelected, onSelect }) {
  const [hover, setHover] = useState(false);
  const showOverlay = hover || isSelected;
  const isOffline = tile.status === 'offline';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(tile.id)}
      style={{
        position: 'relative',
        background: tokens.bgTile,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        outline: isSelected
          ? `2px solid ${tokens.primary}`
          : '1px solid rgba(255,255,255,0.04)',
        outlineOffset: isSelected ? -2 : 0,
        transition: 'outline 120ms ease, transform 120ms ease',
        transform: hover && !isSelected ? 'translateY(-1px)' : 'none',
        boxShadow: isSelected ? tokens.shadow2 : 'none',
      }}
    >
      <FauxFrame kind={tile.image} />

      {/* TOP-LEFT — persistent status strip */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '4px 8px',
            borderRadius: 3,
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          <StatusDot status={tile.status} size={7} animated />
          {tile.status === 'recording' && (
            <span style={{ color: '#FF8A8A', fontWeight: 600 }}>REC</span>
          )}
          {tile.status === 'online' && <span>LIVE</span>}
          {tile.status === 'offline' && (
            <span style={{ color: '#8A95A0' }}>OFFLINE</span>
          )}
          {tile.isPTZ && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ color: '#A8C8E8' }}>PTZ</span>
            </>
          )}
        </div>

        {tile.timestamp && (
          <div
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.85)',
              background: 'rgba(0,0,0,0.45)',
              padding: '4px 8px',
              borderRadius: 3,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {tile.timestamp}
          </div>
        )}
      </div>

      {/* TOP-RIGHT action toolbar — appears on hover/select */}
      {!isOffline && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 2,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 3,
            padding: 2,
            opacity: showOverlay ? 1 : 0,
            transform: showOverlay ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 140ms ease, transform 140ms ease',
            pointerEvents: showOverlay ? 'auto' : 'none',
            transform: showOverlay ? 'translateY(28px)' : 'translateY(20px)',
          }}
        >
          <IconButton icon={Camera} label="Snapshot" size={14} dark />
          <IconButton icon={Bookmark} label="Bookmark moment" size={14} dark />
          <IconButton icon={Rewind} label="Jump to playback" size={14} dark />
          <IconButton icon={ZoomIn} label="Digital zoom" size={14} dark />
          <IconButton icon={Maximize2} label="Expand tile" size={14} dark />
          <IconButton icon={MoreVertical} label="More" size={14} dark />
        </div>
      )}

      {/* Camera name + site context — bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 12px 10px',
          background:
            'linear-gradient(180deg, transparent, rgba(0,0,0,0.65) 60%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: 0.1,
            }}
          >
            {tile.cameraName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Folder size={10} strokeWidth={2} />
            {tile.site}
          </div>
        </div>

        {!isOffline && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontSize: 10,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              flexShrink: 0,
            }}
          >
            {tile.motion && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  color: '#FFB74D',
                }}
              >
                <Activity size={10} />
                MOTION
              </span>
            )}
            <span>{tile.fps}fps</span>
            <span>{tile.bitrate}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sites tree ---------------------------------------------------------

function SiteRow({ site, onToggle }) {
  return (
    <div>
      <button
        onClick={() => onToggle(site.name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '8px 12px 8px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
          color: tokens.textPrimary,
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.bgHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <ChevronDown
          size={14}
          strokeWidth={2}
          style={{
            transform: site.expanded ? 'rotate(0)' : 'rotate(-90deg)',
            transition: 'transform 140ms ease',
            color: tokens.textSecondary,
          }}
        />
        <Folder size={14} strokeWidth={1.8} color={tokens.textSecondary} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {site.name}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: tokens.textHint,
            background: tokens.divider,
            padding: '1px 7px',
            borderRadius: 10,
          }}
        >
          {site.onlineCount}/{site.cameraCount}
        </span>
      </button>

      {site.expanded &&
        site.cameras.map((cam, i) => (
          <button
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '6px 12px 6px 38px',
              background: cam.selected ? tokens.bgSelected : 'transparent',
              border: 'none',
              cursor: 'pointer',
              gap: 8,
              color: cam.selected ? tokens.primary : tokens.textPrimary,
              fontSize: 12.5,
              fontWeight: cam.selected ? 600 : 400,
              borderLeft: cam.selected
                ? `2px solid ${tokens.primary}`
                : '2px solid transparent',
              paddingLeft: cam.selected ? 36 : 38,
            }}
            onMouseEnter={(e) => {
              if (!cam.selected) e.currentTarget.style.background = tokens.bgHover;
            }}
            onMouseLeave={(e) => {
              if (!cam.selected)
                e.currentTarget.style.background = 'transparent';
            }}
          >
            <Video size={13} strokeWidth={1.6} color={tokens.textSecondary} />
            <span
              style={{
                flex: 1,
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {cam.name}
            </span>
            <StatusDot status={cam.status} size={6} animated />
          </button>
        ))}
    </div>
  );
}

// ---- Main component -----------------------------------------------------

export default function DC3LiveMonitoring() {
  const [siteState, setSiteState] = useState(sites);
  const [selectedTile, setSelectedTile] = useState(1);
  const [mode, setMode] = useState('live');
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(true);

  const toggleSite = (name) => {
    setSiteState((prev) =>
      prev.map((s) => (s.name === name ? { ...s, expanded: !s.expanded } : s))
    );
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: tokens.bgApp,
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: tokens.textPrimary,
        fontSize: 13,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes recPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(211, 47, 47, 0); }
        }
      `}</style>

      {/* ===== TOPBAR ===== */}
      <header
        style={{
          height: 52,
          background: tokens.bgTopbar,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          flexShrink: 0,
          color: tokens.textOnDark,
          gap: 16,
          boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              background: '#fff',
              clipPath:
                'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
            }}
          />
          <div style={{ fontWeight: 700, letterSpacing: 1.2, fontSize: 15 }}>
            HEXAGON
          </div>
          <div
            style={{
              width: 1,
              height: 22,
              background: 'rgba(255,255,255,0.2)',
              marginLeft: 8,
            }}
          />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            dC3 Video Cloud
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Global search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 4,
            padding: '6px 10px',
            width: 280,
            gap: 8,
          }}
        >
          <Search size={14} strokeWidth={1.8} color="rgba(255,255,255,0.7)" />
          <input
            placeholder="Search cameras, sites, events…"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 12.5,
              flex: 1,
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
              padding: '1px 5px',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 3,
            }}
          >
            ⌘K
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <IconButton icon={Bell} label="Alerts" dark />
          <IconButton icon={HelpCircle} label="Help" dark />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 12,
            borderLeft: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#43A047',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            SM
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Sunil Mudholkar</div>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left rail */}
        <nav
          style={{
            width: 72,
            background: tokens.bgPanel,
            borderRight: `1px solid ${tokens.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 12,
            gap: 4,
            flexShrink: 0,
          }}
        >
          {[
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: Monitor, label: 'Monitoring', active: true },
            { icon: ShieldCheck, label: 'Health' },
            { icon: Bell, label: 'Alerts', badge: 3 },
            { icon: Search, label: 'Search' },
            { icon: Archive, label: 'Archive' },
          ].map((item, i) => (
            <button
              key={i}
              style={{
                width: 56,
                height: 56,
                background: item.active ? tokens.primaryLight : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: item.active ? tokens.primary : tokens.textSecondary,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!item.active)
                  e.currentTarget.style.background = tokens.bgHover;
              }}
              onMouseLeave={(e) => {
                if (!item.active)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              <item.icon size={18} strokeWidth={1.7} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>
                {item.label}
              </span>
              {item.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 14,
                    background: tokens.recordingRed,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    minWidth: 14,
                    height: 14,
                    padding: '0 4px',
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <button
            style={{
              width: 56,
              height: 56,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: tokens.textSecondary,
              marginBottom: 12,
            }}
          >
            <Settings size={18} strokeWidth={1.7} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>Settings</span>
          </button>
        </nav>

        {/* Sites / Layouts panel */}
        {layoutPanelOpen && (
          <aside
            style={{
              width: 280,
              background: tokens.bgPanel,
              borderRight: `1px solid ${tokens.border}`,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '14px 16px 12px',
                borderBottom: `1px solid ${tokens.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: tokens.textHint,
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                Camera library
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  background: tokens.divider,
                  padding: 3,
                  borderRadius: 5,
                }}
              >
                {['Sites', 'Layouts', 'Map'].map((tab, i) => (
                  <button
                    key={tab}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      background: i === 0 ? tokens.bgPanel : 'transparent',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: i === 0 ? 600 : 500,
                      color: i === 0 ? tokens.textPrimary : tokens.textSecondary,
                      boxShadow: i === 0 ? tokens.shadow1 : 'none',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: tokens.bgApp,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 4,
                  padding: '6px 10px',
                }}
              >
                <Search size={13} color={tokens.textHint} />
                <input
                  placeholder="Search sites, cameras…"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    fontSize: 12.5,
                    color: tokens.textPrimary,
                  }}
                />
              </div>
              <IconButton icon={Filter} label="Filter" />
            </div>

            <div
              style={{
                padding: '4px 16px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11.5,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: tokens.textSecondary,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  style={{
                    width: 13,
                    height: 13,
                    accentColor: tokens.primary,
                    margin: 0,
                  }}
                />
                Show online only
              </label>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: tokens.primary,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Collapse all
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 4px 12px',
              }}
            >
              {siteState.map((site) => (
                <SiteRow key={site.name} site={site} onToggle={toggleSite} />
              ))}
            </div>

            <div
              style={{
                padding: '10px 16px',
                borderTop: `1px solid ${tokens.border}`,
                fontSize: 11,
                color: tokens.textHint,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>43 cameras · 37 online</span>
              <span style={{ color: tokens.recordingRed, fontWeight: 600 }}>
                ● 12 recording
              </span>
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            background: tokens.bgApp,
          }}
        >
          {/* Workspace toolbar */}
          <div
            style={{
              background: tokens.bgPanel,
              borderBottom: `1px solid ${tokens.border}`,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setLayoutPanelOpen(!layoutPanelOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 6,
                color: tokens.textSecondary,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {layoutPanelOpen ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ color: tokens.textHint, fontWeight: 500 }}>
                Workspace
              </span>
              <ChevronRight size={12} color={tokens.textHint} />
              <span>2x2 Grid · Mixed sites</span>
            </div>

            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: `1px solid ${tokens.border}`,
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: 12,
                color: tokens.textPrimary,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <Plus size={13} />
              Save layout
            </button>

            <div style={{ flex: 1 }} />

            {/* Tool group: layout */}
            <div
              style={{
                display: 'flex',
                gap: 2,
                padding: 2,
                background: tokens.divider,
                borderRadius: 4,
              }}
            >
              <IconButton icon={Grid3x3} label="Grid layout" active />
              <IconButton icon={Tv} label="Single view" />
              <IconButton icon={Map} label="Map view" />
            </div>

            {/* Tool group: actions */}
            <div style={{ display: 'flex', gap: 2 }}>
              <IconButton icon={Eye} label="Tour mode" />
              <IconButton icon={Maximize2} label="Fullscreen" />
            </div>

            <div
              style={{
                width: 1,
                height: 20,
                background: tokens.border,
                margin: '0 4px',
              }}
            />

            {/* MODE TOGGLE — the critical component */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: tokens.divider,
                padding: 3,
                borderRadius: 5,
                gap: 2,
              }}
            >
              <button
                onClick={() => setMode('live')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  background: mode === 'live' ? tokens.bgPanel : 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color:
                    mode === 'live' ? tokens.liveGreen : tokens.textSecondary,
                  boxShadow: mode === 'live' ? tokens.shadow1 : 'none',
                  transition: 'all 140ms ease',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background:
                      mode === 'live' ? tokens.liveGreenBright : tokens.offline,
                    animation:
                      mode === 'live' ? 'pulse 2s infinite' : 'none',
                  }}
                />
                LIVE
              </button>
              <button
                onClick={() => setMode('playback')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  background:
                    mode === 'playback' ? tokens.bgPanel : 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color:
                    mode === 'playback'
                      ? tokens.textPrimary
                      : tokens.textSecondary,
                  boxShadow: mode === 'playback' ? tokens.shadow1 : 'none',
                  transition: 'all 140ms ease',
                }}
              >
                <Clock size={12} />
                PLAYBACK
              </button>
            </div>
          </div>

          {/* Tile grid */}
          <div
            style={{
              flex: 1,
              padding: 14,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 10,
              minHeight: 0,
            }}
          >
            {tiles.map((tile) => (
              <CameraTile
                key={tile.id}
                tile={tile}
                isSelected={selectedTile === tile.id}
                onSelect={setSelectedTile}
              />
            ))}
          </div>

          {/* Recent activity strip — the "fast path" into rewind */}
          <div
            style={{
              background: tokens.bgPanel,
              borderTop: `1px solid ${tokens.border}`,
              padding: '10px 16px 12px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: tokens.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                <Activity size={12} />
                Last 15 minutes
                <span
                  style={{
                    color: tokens.textHint,
                    fontWeight: 500,
                    textTransform: 'none',
                    letterSpacing: 0,
                    marginLeft: 4,
                  }}
                >
                  · drag backward to rewind
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  fontSize: 11,
                  color: tokens.textSecondary,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: tokens.liveGreenBright,
                      borderRadius: 1,
                    }}
                  />
                  Recording
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: tokens.warning,
                      borderRadius: 1,
                    }}
                  />
                  Motion
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: tokens.recordingRed,
                      borderRadius: 1,
                    }}
                  />
                  Alert
                </div>
              </div>
            </div>

            {/* Mini-timelines stacked per camera */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {tiles.map((tile, idx) => (
                <div
                  key={tile.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      width: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: tokens.textSecondary,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {tile.cameraName}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      height: 14,
                      background: tokens.divider,
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: tile.status === 'offline' ? 'not-allowed' : 'ew-resize',
                    }}
                  >
                    {tile.status !== 'offline' && (
                      <>
                        {/* recording bar */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                            background:
                              tile.status === 'recording'
                                ? `repeating-linear-gradient(90deg, ${tokens.liveGreenBright} 0, ${tokens.liveGreenBright} 100%)`
                                : `repeating-linear-gradient(90deg, ${tokens.liveGreenBright} 0, ${tokens.liveGreenBright} 70%, ${tokens.divider} 70%, ${tokens.divider} 80%, ${tokens.liveGreenBright} 80%)`,
                            opacity: 0.85,
                          }}
                        />
                        {/* motion markers */}
                        {tile.motion &&
                          [25, 48, 72, 88].map((pos) => (
                            <div
                              key={pos}
                              style={{
                                position: 'absolute',
                                left: `${pos}%`,
                                top: 0,
                                bottom: 0,
                                width: 3,
                                background: tokens.warning,
                              }}
                            />
                          ))}
                        {/* alert marker */}
                        {idx === 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '62%',
                              top: 0,
                              bottom: 0,
                              width: 3,
                              background: tokens.recordingRed,
                              boxShadow: `0 0 4px ${tokens.recordingRed}`,
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      fontFamily:
                        'ui-monospace, "SF Mono", Menlo, monospace',
                      fontSize: 10.5,
                      color: tokens.textHint,
                      width: 50,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {tile.status !== 'offline' ? 'now' : '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Time ruler */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                marginLeft: 110,
                marginRight: 60,
                fontSize: 10,
                color: tokens.textHint,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              }}
            >
              <span>13:10</span>
              <span>13:13</span>
              <span>13:16</span>
              <span>13:19</span>
              <span>13:22</span>
              <span>13:25 NOW</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
