// Charts — tiny dependency-free SVG/flex charts shared by Finance and Reports.
// Theme-aware via CSS variables; colors passed in by the caller.
import type { ReactNode } from "react";

const MONO = "'JetBrains Mono', monospace";

export function LineArea({ points, labels, color, height = 150 }: { points: number[]; labels?: string[]; color: string; height?: number }) {
  const W = 640, H = height, pad = 8;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad + (H - pad * 2) * (1 - (v - min) / span);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const gid = "g" + color.replace(/[^a-z0-9]/gi, "");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 4 : 2.5} fill={color} />)}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {labels.map((l, i) => <span key={i} style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-5)" }}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

export function BarPairs({ data, aColor = "#22c55e", bColor = "#f59e0b", height = 130 }: { data: { label: string; a: number; b: number }[]; aColor?: string; bColor?: string; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: height - 20, width: "100%", justifyContent: "center" }}>
            <span title={String(d.a)} style={{ width: "42%", height: `${(d.a / max) * 100}%`, background: aColor, borderRadius: "3px 3px 0 0", minHeight: 2 }} />
            <span title={String(d.b)} style={{ width: "42%", height: `${(d.b / max) * 100}%`, background: bColor, borderRadius: "3px 3px 0 0", minHeight: 2 }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-5)" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBars({ rows, fmt }: { rows: { label: string; value: number; color?: string; sub?: ReactNode }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 12.5, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            {r.sub}
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: r.color || "var(--ink-2)" }}>{fmt ? fmt(r.value) : r.value}</span>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
            <div style={{ width: (r.value / max) * 100 + "%", height: "100%", borderRadius: 99, background: r.color || "var(--acc)", opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
