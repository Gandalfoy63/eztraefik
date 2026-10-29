// Docs: docs/05 - UI-UX/Charts.md
// Single-series time chart in inline SVG: 2px line, recessive grid, crosshair + tooltip on hover and with arrow keys.
// One series per chart by design (no dual axis, no color-coded series); see the Charts note for why.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface XY {
  t: number; // unix seconds
  v: number;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

const fmtTime = (t: number, long: boolean) =>
  new Date(t * 1000).toLocaleString([], long ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" });

export function LineChart({
  data, format, label, height = 180, summary,
}: { data: XY[]; format: (v: number) => string; label: string; height?: number; summary?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(240, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 48, r: 12, t: 12, b: 24 };
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const longRange = data.length > 1 && data[data.length - 1].t - data[0].t > 86400;

  const { path, max, xs, ys } = useMemo(() => {
    const max = niceMax(Math.max(0, ...data.map(d => d.v)));
    const n = Math.max(1, data.length - 1);
    const xs = data.map((_, i) => pad.l + (i / n) * (W - pad.l - pad.r));
    const ys = data.map(d => pad.t + (1 - d.v / max) * (H - pad.t - pad.b));
    const path = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
    return { path, max, xs, ys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, H, W]);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    xs.forEach((px, i) => {
      if (Math.abs(px - x) < Math.abs(xs[best] - x)) best = i;
    });
    setHover(best);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!data.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const cur = hover ?? data.length - 1;
      setHover(Math.max(0, Math.min(data.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Escape") setHover(null);
  };

  const grid = [0, 0.5, 1].map(f => ({ y: pad.t + (1 - f) * (H - pad.t - pad.b), v: f * max }));
  const ticks = data.length > 1 ? [0, 0.33, 0.66, 1].map(f => Math.round(f * (data.length - 1))) : [];
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`${label}. ${summary ?? ""}${h ? ` Selected: ${fmtTime(h.t, true)}, ${format(h.v)}.` : ""}`}
        tabIndex={0}
        onPointerMove={pick}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {grid.map(g => (
          <g key={g.y}>
            <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={g.y} y2={g.y} />
            <text className="chart-axis" x={pad.l - 8} y={g.y + 4} textAnchor="end">
              {format(g.v)}
            </text>
          </g>
        ))}
        {ticks.map(i => (
          <text key={i} className="chart-axis" x={xs[i]} y={H - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}>
            {fmtTime(data[i].t, longRange)}
          </text>
        ))}
        {data.length > 1 && <path className="chart-line" d={path} vectorEffect="non-scaling-stroke" />}
        {h && hover !== null && (
          <>
            <line className="chart-cross" x1={xs[hover]} x2={xs[hover]} y1={pad.t} y2={H - pad.b} vectorEffect="non-scaling-stroke" />
            <circle className="chart-dot" cx={xs[hover]} cy={ys[hover]} r={4} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {h && hover !== null && (
        <div className="chart-tip" style={{ left: `${(xs[hover] / W) * 100}%` }} aria-hidden="true">
          <strong>{format(h.v)}</strong>
          <span>{fmtTime(h.t, true)}</span>
        </div>
      )}
    </div>
  );
}

// Sparkline: a tiny trend line for stat tiles. Not interactive; the tile links to the full chart.
export function Sparkline({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(1, ...data);
  const n = Math.max(1, data.length - 1);
  const d = data.map((v, i) => `${i ? "L" : "M"}${((i / n) * 200).toFixed(1)} ${(30 - (v / max) * 26).toFixed(1)}`).join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 200 32" preserveAspectRatio="none" role="img" aria-label={label}>
      {data.length > 1 && <path d={d} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
