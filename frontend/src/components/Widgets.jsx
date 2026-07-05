import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle, Users, Check, AlertCircle, X } from 'lucide-react';

/* ─── Brand mark (X with crosshair) ──────────────────────── */
export function BrandMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="11" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="13" cy="13" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M13 1.5V6 M13 20V24.5 M1.5 13H6 M20 13H24.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
      <circle cx="13" cy="13" r="1.5" fill="var(--accent)" />
    </svg>
  );
}

/* ─── Trust Gauge (radial arc) ───────────────────────────── */
export function TrustGauge({ value, size = 220, thick = 12, animate = true }) {
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) { setShown(value); return; }
    let start;
    let raf;
    const dur = 1100;
    const from = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thick) / 2;
  const startA = -225 * (Math.PI / 180);
  const endA   =   45 * (Math.PI / 180);
  const totalA = endA - startA;
  const pct = shown / 100;
  const curA = startA + totalA * pct;

  const polar = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [sx, sy] = polar(startA);
  const [ex, ey] = polar(endA);
  const [cxA, cyA] = polar(curA);
  const largeBg = totalA > Math.PI ? 1 : 0;
  const largeV  = (curA - startA) > Math.PI ? 1 : 0;

  const color = shown < 40 ? 'var(--bad)' : shown < 70 ? 'var(--warn)' : 'var(--good)';

  return (
    <div className="trust-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeBg} 1 ${ex} ${ey}`} stroke="var(--line)" strokeWidth={thick} fill="none" strokeLinecap="round" />
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeV} 1 ${cxA} ${cyA}`}  stroke={color}     strokeWidth={thick} fill="none" strokeLinecap="round" />
        {[0, 25, 50, 75, 100].map((p) => {
          const a = startA + totalA * (p / 100);
          const [tx1, ty1] = [cx + (r + thick / 2 + 3) * Math.cos(a), cy + (r + thick / 2 + 3) * Math.sin(a)];
          const [tx2, ty2] = [cx + (r + thick / 2 + 8) * Math.cos(a), cy + (r + thick / 2 + 8) * Math.sin(a)];
          return <line key={p} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--fg-mute)" strokeWidth="1" />;
        })}
      </svg>
      <div className="trust-gauge-n">
        <div className="trust-gauge-n-inner">
          <span className="trust-gauge-n-num" style={{ color }}>{shown}</span>
          <span className="trust-gauge-n-of">/ 100 GÜVEN</span>
        </div>
      </div>
    </div>
  );
}

/* ─── DNA Radar (centerpiece) ──────────────────────────── */
export function DNARadar({ axes, size = 380 }) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const max = 100;
  const rOuter = (size / 2) - 56;
  const rings = [25, 50, 75, 100];
  const angleFor = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i, v) => {
    const a = angleFor(i);
    const r = (v / max) * rOuter;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const polyPath = useMemo(() => {
    return axes.map((a, i) => point(i, a.value)).map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z';
  }, [axes]);
  const labelPos = (i) => {
    const a = angleFor(i);
    const r = rOuter + 28;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((p, i) => {
        const r = (p / 100) * rOuter;
        const pts = Array.from({ length: n }, (_, j) => {
          const a = angleFor(j);
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(' ');
        return (
          <polygon
            key={p}
            points={pts}
            fill="none"
            stroke="var(--line-soft)"
            strokeWidth={i === rings.length - 1 ? 1 : 0.6}
            strokeDasharray={i % 2 ? '3 3' : ''}
          />
        );
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, max);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-soft)" strokeWidth="0.6" />;
      })}
      <path d={polyPath} fill="var(--accent)" fillOpacity="0.16" stroke="var(--accent)" strokeWidth="1.5" />
      {axes.map((a, i) => {
        const [x, y] = point(i, a.value);
        const col = a.tier === 'bad' ? 'var(--bad)' : a.tier === 'warn' ? 'var(--warn)' : 'var(--good)';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill="var(--bg-panel)" stroke={col} strokeWidth="2" />
            <circle cx={x} cy={y} r="2.5" fill={col} />
          </g>
        );
      })}
      {axes.map((a, i) => {
        const [x, y] = labelPos(i);
        return (
          <g key={`l${i}`}>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-mono)" fontSize="11" fill="var(--fg)" letterSpacing="0.1em">
              {a.axis.toUpperCase()}
            </text>
            <text x={x} y={y + 16} textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-mono)" fontSize="13" fill={a.tier === 'bad' ? 'var(--bad)' : a.tier === 'warn' ? 'var(--warn)' : 'var(--good)'}>
              {a.value}
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9"
        fill="var(--fg-mute)" letterSpacing="0.15em">MANİPÜLASYON</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9"
        fill="var(--fg-mute)" letterSpacing="0.15em">DNA</text>
    </svg>
  );
}

/* ─── Mini gauge (extension) ────────────────────────────── */
export function MiniGauge({ value, size = 110 }) {
  const cx = size / 2, cy = size / 2;
  const r = (size - 14) / 2;
  const startA = -Math.PI / 2 - Math.PI;
  const endA   = -Math.PI / 2 + Math.PI;
  const totalA = endA - startA;
  const pct = value / 100;
  const curA = startA + totalA * pct;
  const polar = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [sx, sy] = polar(startA);
  const [cxA, cyA] = polar(curA);
  const color = value < 40 ? 'var(--bad)' : value < 70 ? 'var(--warn)' : 'var(--good)';
  return (
    <div className="ext-mini-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${(curA - startA) > Math.PI ? 1 : 0} 1 ${cxA} ${cyA}`}
          stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, lineHeight: 1, color, letterSpacing: '-0.02em' }}>{value}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-mute)', letterSpacing: '0.1em', marginTop: 2 }}>GÜVEN</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sparkline (price history) ─────────────────────────── */
export function Sparkline({ data, width = 380, height = 70, color = 'var(--accent)' }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length < 2) return <p style={{ color: 'var(--fg-mute)', fontSize: 12 }}>Fiyat geçmişi verisi yetersiz.</p>;
  
  // Hem sayı dizisini hem de obje dizisini { date, price } destekleyelim
  const pointsData = data.map((d) => {
    if (typeof d === 'object' && d !== null) {
      return { price: d.price ?? d.value ?? 0, date: d.date ?? '' };
    }
    return { price: Number(d) || 0, date: '' };
  });

  const prices = pointsData.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 6;
  const dx = (width - pad * 2) / (pointsData.length - 1);
  
  const pts = pointsData.map((p, i) => {
    const x = pad + i * dx;
    const y = pad + (height - pad * 2) * (1 - (p.price - min) / range);
    return { x, y, price: p.price, date: p.date, index: i };
  });

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = path + ` L ${pts[pts.length - 1].x} ${height - pad} L ${pts[0].x} ${height - pad} Z`;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    
    // En yakın noktayı bul
    let closest = pts[0];
    let minDist = Math.abs(pts[0].x - mouseX);
    
    for (let i = 1; i < pts.length; i++) {
      const dist = Math.abs(pts[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = pts[i];
      }
    }
    setHoveredPoint(closest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          top: -46,
          left: `${(hoveredPoint.x / width) * 100}%`,
          transform: 'translateX(-50%)',
          background: 'var(--bg-elev)',
          border: '1px solid var(--accent)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1
        }}>
          {hoveredPoint.date && <span style={{ opacity: 0.6, fontSize: '8px' }}>{hoveredPoint.date}</span>}
          <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{hoveredPoint.price.toLocaleString('tr-TR')} ₺</span>
        </div>
      )}
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkfill)" />
        <path d={path} stroke={color} strokeWidth="1.5" fill="none" />
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          const isHovered = hoveredPoint && hoveredPoint.index === i;
          return (
            <circle 
              key={i} 
              cx={p.x} 
              cy={p.y} 
              r={isHovered ? 4 : (isLast ? 3 : 1.5)}
              fill={isHovered ? 'var(--bg)' : (isLast ? color : 'var(--bg-panel)')} 
              stroke={color} 
              strokeWidth="1" 
            />
          );
        })}
        {hoveredPoint && (
          <line 
            x1={hoveredPoint.x} 
            y1={0} 
            x2={hoveredPoint.x} 
            y2={height} 
            stroke="var(--accent)" 
            strokeWidth="0.8" 
            strokeDasharray="2 2" 
            opacity="0.5"
          />
        )}
      </svg>
    </div>
  );
}

/* ─── LangGraph node graph (5 agents w/ edges) ───────────── */
export function AgentGraph({ states }) {
  const agents = ['research', 'xray', 'analysis', 'advisor', 'challenger'];
  const labels = {
    research:   { tag: '01', name: 'Tulpar',   desc: 'Yorumlar, forumlar ve videolar toplanıyor' },
    xray:       { tag: '02', name: 'Kam',      desc: 'Fiyat oyunları ve sahte iddialar aranıyor' },
    analysis:   { tag: '03', name: 'Bilge',    desc: 'Güçlü ve zayıf yönler değerlendiriliyor' },
    advisor:    { tag: '04', name: 'Yargucu',  desc: 'Sana özel uyum skoru ve karar üretiliyor' },
    challenger: { tag: '05', name: 'Erlik',    desc: 'Karar sorgulanıyor, karşı senaryolar üretiliyor' },
  };
  return (
    <div className="agent-graph">
      <div className="panel-h" style={{ marginBottom: 16 }}>
        <h3>LangGraph · Agentic Pipeline</h3>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>
          5 NODE · DIRECTED
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
        {agents.map((id) => {
          const s = states[id] || 'idle';
          return (
            <div key={id} className="agent-node" data-state={s}>
              <div className="agent-node-h">
                <span>NODE {labels[id].tag} · {labels[id].name.toUpperCase()}</span>
                {s === 'active' && <span className="agent-node-spin" />}
                {s === 'done' && <span className="agent-node-tick">✓</span>}
                {s === 'idle' && <span className="pip pip-idle" />}
              </div>
              <div className="agent-node-t">{labels[id].name}</div>
              <div className="agent-node-d">{labels[id].desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Compact agent strip (used in dashboard topbar) ────── */
export function AgentStrip({ states }) {
  const agents = ['research', 'xray', 'analysis', 'advisor', 'challenger'];
  const names = { research: 'TULPAR', xray: 'KAM', analysis: 'BİLGE', advisor: 'YARGUCU', challenger: 'ERLİK' };
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      border: '1px solid var(--line-soft)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      background: 'var(--bg-elev)',
    }}>
      {agents.map((id, i) => (
        <div key={id} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.08em',
          color: 'var(--fg-dim)',
          borderRight: i < agents.length - 1 ? '1px solid var(--line-soft)' : 'none',
        }}>
          <span className={`pip pip-${states[id] === 'done' ? 'good' : 'idle'}`} />
          {names[id]}
        </div>
      ))}
    </div>
  );
}

/* ─── Comparison Radar (two overlapping shapes) ─────────── */
export function ComparisonRadar({ axesA, axesB, size = 380, colorA, colorB }) {
  colorA = colorA || 'var(--accent)';
  colorB = colorB || 'var(--good)';
  const n = axesA.length;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = (size / 2) - 56;
  const rings = [25, 50, 75, 100];
  const angleFor = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i, v) => {
    const a = angleFor(i);
    const r = (v / 100) * rOuter;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (axes) => axes.map((a, i) => pt(i, a.value))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z';
  const labelPos = (i) => {
    const a = angleFor(i);
    const r = rOuter + 28;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((p, i) => {
        const r = (p / 100) * rOuter;
        const pts = Array.from({ length: n }, (_, j) => {
          const a = angleFor(j);
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(' ');
        return <polygon key={p} points={pts} fill="none" stroke="var(--line-soft)"
          strokeWidth={i === rings.length - 1 ? 1 : 0.6} strokeDasharray={i % 2 ? '3 3' : ''} />;
      })}
      {axesA.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-soft)" strokeWidth="0.6" />;
      })}
      <path d={poly(axesB)} fill={colorB} fillOpacity="0.13" stroke={colorB} strokeWidth="1.5" />
      <path d={poly(axesA)} fill={colorA} fillOpacity="0.18" stroke={colorA} strokeWidth="1.5" strokeDasharray="4 3" />
      {axesA.map((a, i) => {
        const [x, y] = pt(i, a.value);
        return <circle key={`a${i}`} cx={x} cy={y} r="4" fill={colorA} stroke="var(--bg-panel)" strokeWidth="1.5" />;
      })}
      {axesB.map((a, i) => {
        const [x, y] = pt(i, a.value);
        return <circle key={`b${i}`} cx={x} cy={y} r="4" fill={colorB} stroke="var(--bg-panel)" strokeWidth="1.5" />;
      })}
      {axesA.map((a, i) => {
        const [x, y] = labelPos(i);
        return (
          <text key={`l${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--font-mono)" fontSize="11" fill="var(--fg)" letterSpacing="0.1em">
            {a.axis.toUpperCase()}
          </text>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9"
        fill="var(--fg-mute)" letterSpacing="0.15em">DNA</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9"
        fill="var(--fg-mute)" letterSpacing="0.15em">OVERLAY</text>
    </svg>
  );
}

/* ─── XrayReveal — before/after drag slider ──────────────── */
export function XrayReveal({ data }) {
  const [pos, setPos] = useState(50);
  const stageRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    let raf;
    let startT;
    const duration = 1800;
    const animate = (ts) => {
      if (!startT) startT = ts;
      const t = Math.min(1, (ts - startT) / duration);
      const easeT = 0.5 - 0.4 * Math.cos(t * Math.PI * 2);
      setPos(50 - 32 + easeT * 64);
      if (t < 1) raf = requestAnimationFrame(animate);
      else setPos(50);
    };
    const timer = setTimeout(() => { raf = requestAnimationFrame(animate); }, 500);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []);

  const onMove = (clientX) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    onMove(e.clientX);
    e.target.setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    onMove(e.clientX);
  };
  const handlePointerUp = (e) => {
    draggingRef.current = false;
    e.target.releasePointerCapture?.(e.pointerId);
  };

  if (!data || !data.comparisons?.length) return null;

  const { before: B, after: A, comparisons: items } = data;

  const sevColor = (s) => s === 'bad' ? 'var(--bad)' : s === 'good' ? 'var(--good)' : 'var(--warn)';

  return (
    <div className="xray-reveal">
      <div className="xray-reveal-head">
        <div className="xray-reveal-head-l">
          <h3 className="xray-reveal-head-t">Yüzey ↔ Röntgen</h3>
          <span className="xray-reveal-head-s">Etiketin önü vs MergeN'in gördüğü · {items.length} eksen karşılaştırma</span>
        </div>
        <span className="xray-reveal-head-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5v14M16 5v14M5 8h3M5 16h3M16 8h3M16 16h3"/></svg>
          KAYDIR
        </span>
      </div>

      <div className="xray-reveal-stage" ref={stageRef}>
        <div className="xray-reveal-grid" />

        {/* BEFORE layer */}
        <div className="xray-layer xray-layer-before">
          <span className="xray-side-tag">{B?.label || 'ÜRETİCİ İDDİALARI'}</span>
          <div className="xray-stats xray-stats-grid">
            {items.map((item) => (
              <div key={item.id} className="xray-stat">
                <span className="xray-stat-l">{item.label.toUpperCase()}</span>
                <span className="xray-stat-v">{item.beforeVal ?? '—'}</span>
                <span className="xray-stat-sub">{item.beforeSub ?? ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AFTER layer (clipped) */}
        <div className="xray-layer xray-layer-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <span className="xray-side-tag xray-side-tag-r">{A?.label || 'RÖNTGEN SONUCU'}</span>
          <div className="xray-stats xray-stats-grid xray-stats-after">
            {items.map((item) => (
              <div key={item.id} className="xray-stat">
                <span className="xray-stat-l">{item.label.toUpperCase()}</span>
                <span className="xray-stat-v">{item.afterVal ?? '—'}</span>
                <span className="xray-stat-sub">{item.afterSub ?? ''}</span>
                {item.deltaLabel && (
                  <span className="xray-stat-delta" style={{ color: sevColor(item.severity), borderColor: sevColor(item.severity) }}>
                    {item.deltaLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* divider + handle */}
        <div className="xray-divider" style={{ left: `${pos}%` }}>
          <div
            className="xray-divider-handle"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        <input
          type="range" min="0" max="100" step="0.1" value={pos}
          onChange={(e) => setPos(parseFloat(e.target.value))}
          className="xray-input"
          aria-label="Röntgen slider"
        />
      </div>

      <div className="xray-reveal-foot">
        <span className="xray-reveal-foot-l">◂ ÜRETİCİ GÖZÜ</span>
        <span className="xray-reveal-foot-c">{Math.round(pos)}%</span>
        <span className="xray-reveal-foot-r">RÖNTGEN GERÇEĞİ ▸</span>
      </div>
    </div>
  );
}

const trCapitalize = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR');
  }).join(' ');
};

const formatKey = (key) => {
  const mapping = {
    ses_kalitesi: "Ses Kalitesi",
    mikrofon_kalitesi: "Mikrofon Kalitesi",
    sarj_performansi: "Şarj Performansı",
    malzeme_kalitesi: "Malzeme Kalitesi",
    goruntu_kalitesi: "Görüntü Kalitesi",
    kullanim_kolayligi: "Kullanım Kolaylığı",
    fiyat_performans: "Fiyat / Performans",
    konfor: "Konfor",
    islemci: "İşlemci",
    hafiza: "Hafıza",
    ekran: "Ekran/Görüntü Kalitesi",
    batarya: "Batarya/Pil Ömrü",
    hiz: "Hız/Performans",
    tasarim: "Tasarım",
  };
  const lowerKey = String(key || '').toLocaleLowerCase('tr-TR');
  if (mapping[lowerKey]) return mapping[lowerKey];
  // Fallback: snake_case to Title Case (Örn: goruntu_kalitesi -> Görüntü Kalitesi)
  const cleanStr = String(key || '').replace(/_/g, ' ');
  return trCapitalize(cleanStr);
};

/* ─── Source Consensus — tüm kaynakların konsolide ortalaması ── */
export function SourceConsensus({ data, productName }) {
  if (!data) return null;
  const { hb_summary: hbRaw, category_scores: catScores } = data;

  let platformData = null;

  if (catScores && catScores.length > 0) {
    platformData = catScores.map(cs => {
      const pos = cs.positiveCount || cs.sentiment?.pos || cs.sentiment?.positive || 0;
      const neg = cs.negativeCount || cs.sentiment?.neg || cs.sentiment?.negative || 0;
      const total = pos + neg;
      const pctPos = total > 0 ? Math.round((pos / total) * 100) : 0;
      
      let score100 = 0;
      if (cs.score !== undefined) {
        score100 = cs.score > 10 ? Math.round(cs.score) : Math.round((cs.score / 10) * 100);
      } else {
        score100 = Math.round((cs.average || 0) / 5 * 100);
      }
      
      if (score100 === 0 && total > 0) score100 = pctPos;
      
      return {
        key: cs.key,
        name: formatKey(cs.name || cs.key),
        score: Math.max(0, Math.min(100, score100)),
        text: cs.topFinding || '',
        pos,
        neg,
        pctPos
      };
    });
  } 
  else if (hbRaw && Object.keys(hbRaw).length > 0) {
    platformData = Object.entries(hbRaw).map(([key, hbVal]) => {
      const s100 = Math.round((hbVal / 5) * 100);
      return {
        key, name: formatKey(key), score: s100, text: 'E-Ticaret + Forum + YouTube Çapraz Analizi',
        pos: 0, neg: 0, pctPos: 0
      };
    });
  }

  if (!platformData || platformData.length === 0) return null;

  const getColor = (score) => {
    if (score >= 80) return '#4ADE80';
    if (score >= 60) return '#FBBF24';
    return '#F87171';
  };

  return (
    <div className="panel" style={{ margin: '24px 0', padding: '36px', border: 'none', background: 'var(--bg-panel, #121316)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 24, marginBottom: 36 }}>
        <h3 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
          KATEGORİ SKORLARI · GERÇEK ÖLÇÜM KONSENSÜSÜ
        </h3>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
          YORUM + YOUTUBE + FORUM ÇAPRAZ
        </span>
      </div>
      
      {/* LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {platformData.map((item) => {
          const color = getColor(item.score);
          const hasStats = item.pos > 0 || item.neg > 0;
          
          return (
            <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              {/* Left Column: Name & Stats */}
              <div style={{ width: '220px', flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg)', letterSpacing: '0.01em', marginBottom: 6 }}>
                  {item.name}
                </div>
                {hasStats && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#4ADE80' }}>+{item.pos}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                    <span style={{ color: '#F87171' }}>-{item.neg}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{item.pctPos}% lehte</span>
                  </div>
                )}
              </div>
              
              {/* Middle Column: Progress Bar & Text */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 5 }}>
                {/* Progress Bar */}
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${item.score}%`, 
                    height: '100%', 
                    background: color, 
                    borderRadius: 3, 
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }} />
                </div>
                {/* Finding Text */}
                {item.text && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {item.text}
                  </div>
                )}
              </div>
              
              {/* Right Column: Score */}
              <div style={{ width: '60px', flexShrink: 0, textAlign: 'right', marginTop: -2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: color, letterSpacing: '-0.02em' }}>
                  {item.score}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductClaims({ claims }) {
  if (!claims || claims.length === 0) return null;
  return (
    <div className="panel" style={{ margin: '24px 0', padding: '36px', border: '1px solid rgba(255, 60, 60, 0.15)', background: 'var(--bg-panel, #121316)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 24, marginBottom: 36 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--bad)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          KULLANICI İZLENİMLERİ · ÜRETİCİ VAATLERİ VE GERÇEK DENEYİMLER
        </h3>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
          YÜZEYDEKİ İDDİA VS RÖNTGENDEKİ GERÇEKLİK
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {claims.map((c, i) => {
          const contraryPercentage = c.contrary_percentage !== undefined
            ? c.contrary_percentage
            : (c.score !== undefined ? Math.round((1 - c.score) * 100) : 75);
          const alignmentPct = 100 - contraryPercentage;
          const alignmentTier = alignmentPct >= 70 ? 'good' : alignmentPct >= 40 ? 'warn' : 'bad';
          
          const tierColor = alignmentTier === 'good' ? 'var(--good)' : alignmentTier === 'warn' ? 'var(--warn)' : 'var(--bad)';
          const tierBg = alignmentTier === 'good' ? 'rgba(0, 200, 100, 0.08)' : alignmentTier === 'warn' ? 'rgba(255, 179, 0, 0.08)' : 'rgba(255, 60, 60, 0.08)';
          const tierBorder = alignmentTier === 'good' ? '1px solid rgba(0, 200, 100, 0.2)' : alignmentTier === 'warn' ? '1px solid rgba(255, 179, 0, 0.2)' : '1px solid rgba(255, 60, 60, 0.2)';
          
          const StatusIcon = alignmentTier === 'good' ? Check : alignmentTier === 'warn' ? AlertCircle : X;
          
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Üst: Uyum Skoru */}
              <div style={{ 
                background: tierBg, 
                border: tierBorder,
                padding: '16px 20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.04)'
              }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: tierColor, fontWeight: 600, letterSpacing: '0.1em' }}>UYUM SKORU</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'var(--font-display)', color: tierColor, letterSpacing: '-0.02em' }}>{alignmentPct}%</span>
                  <StatusIcon size={24} color={tierColor} strokeWidth={2.5} />
                </div>
              </div>
              
              {/* Orta: İddia vs Gerçeklik */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* Sol: İddia */}
                <div style={{ padding: '20px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <MessageCircle size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em' }}>ÜRETİCİ VAADİ</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: 500 }}>
                    {c.claim}
                  </p>
                </div>
                
                {/* Sağ: Gerçeklik */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Users size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em' }}>GERÇEK DENEYİM</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: 500 }}>
                    {c.reality}
                  </p>
                </div>
              </div>
              
              {/* Alt: İlerleme Barı */}
              <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.005)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${alignmentPct}%`, height: '100%', background: tierColor, borderRadius: '3px', boxShadow: `0 0 8px ${tierColor}40` }} />
                  </div>
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'flex-start' }}>
                  <span>{alignmentTier === 'good' ? '✓ İddialar doğrulanmıştır' : alignmentTier === 'warn' ? '⚠ Kısmen uyumsuzluk var' : '✗ Uyumsuzluk tespit edildi'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
