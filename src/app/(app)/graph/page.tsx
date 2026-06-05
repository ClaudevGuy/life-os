"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Waypoints } from "lucide-react";
import { useAllItems } from "@/lib/store/items";
import { buildGraph, type GraphNode, type GraphEdge } from "@/lib/links";

function kindColor(kind: string): string {
  return `var(--kind-${kind}, var(--terra))`;
}

export default function GraphPage() {
  const items = useAllItems() ?? [];
  const { nodes, edges } = useMemo(() => buildGraph(items), [items]);

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Waypoints size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
            Connections
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            How your notes, people, and projects link together. Drag to
            untangle, click a dot to open it.
          </p>
        </div>
        {nodes.length > 0 && (
          <span className="text-[12px] text-[var(--muted)] tabular-nums">
            {nodes.length} linked · {edges.length} connections
          </span>
        )}
      </header>

      {nodes.length === 0 ? (
        <Empty />
      ) : (
        <GraphCanvas nodes={nodes} edges={edges} />
      )}
    </div>
  );
}

type P = { x: number; y: number; vx: number; vy: number };

function GraphCanvas({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef<Map<string, P>>(new Map());
  const alphaRef = useRef(1);
  const dragRef = useRef<{ id: string | null; moved: boolean }>({
    id: null,
    moved: false,
  });
  const [, render] = useReducer((x) => x + 1, 0);
  const [hover, setHover] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 620 });

  const nodeKey = nodes.map((n) => n.id).join(",");

  // neighbours of the hovered node (for highlighting)
  const neighbours = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    for (const e of edges) {
      if (e.source === hover) set.add(e.target);
      if (e.target === hover) set.add(e.source);
    }
    return set;
  }, [hover, edges]);

  // measure container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // (re)seed positions when the node set or size changes
  useEffect(() => {
    const map = posRef.current;
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const R = Math.min(dims.w, dims.h) * 0.36;
    nodes.forEach((n, i) => {
      if (!map.has(n.id)) {
        const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
        map.set(n.id, {
          x: cx + R * Math.cos(a) + (i % 7),
          y: cy + R * Math.sin(a) + (i % 5),
          vx: 0,
          vy: 0,
        });
      }
    });
    for (const id of [...map.keys()]) {
      if (!nodes.find((n) => n.id === id)) map.delete(id);
    }
    alphaRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, dims.w, dims.h]);

  // force simulation
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const map = posRef.current;
      const arr = nodes.map((n) => ({ n, p: map.get(n.id) })).filter(
        (x): x is { n: GraphNode; p: P } => !!x.p,
      );
      const alpha = alphaRef.current;
      if (alpha > 0.015 || dragRef.current.id) {
        // repulsion (all pairs)
        for (let a = 0; a < arr.length; a++) {
          for (let b = a + 1; b < arr.length; b++) {
            const pa = arr[a].p;
            const pb = arr[b].p;
            let dx = pa.x - pb.x;
            let dy = pa.y - pb.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 0.01) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              d2 = 0.01;
            }
            const d = Math.sqrt(d2);
            const rep = 6200 / d2;
            const fx = (dx / d) * rep;
            const fy = (dy / d) * rep;
            pa.vx += fx * alpha;
            pa.vy += fy * alpha;
            pb.vx -= fx * alpha;
            pb.vy -= fy * alpha;
          }
        }
        // springs
        const L = 92;
        for (const e of edges) {
          const pa = map.get(e.source);
          const pb = map.get(e.target);
          if (!pa || !pb) continue;
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const f = (d - L) * 0.02;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          pa.vx += fx * alpha;
          pa.vy += fy * alpha;
          pb.vx -= fx * alpha;
          pb.vy -= fy * alpha;
        }
        // centering + integrate + bound
        const cx = dims.w / 2;
        const cy = dims.h / 2;
        const pad = 44;
        for (const { n, p } of arr) {
          if (dragRef.current.id === n.id) {
            p.vx = 0;
            p.vy = 0;
            continue;
          }
          p.vx += (cx - p.x) * 0.0045 * alpha;
          p.vy += (cy - p.y) * 0.0045 * alpha;
          p.vx *= 0.86;
          p.vy *= 0.86;
          p.x += p.vx;
          p.y += p.vy;
          p.x = Math.max(pad, Math.min(dims.w - pad, p.x));
          p.y = Math.max(pad, Math.min(dims.h - pad, p.y));
        }
        alphaRef.current = dragRef.current.id
          ? Math.max(alpha, 0.35)
          : alpha * 0.985;
        render();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, edges, dims.w, dims.h]);

  function toSvg(e: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { id, moved: false };
    alphaRef.current = Math.max(alphaRef.current, 0.4);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d.id) return;
    const p = posRef.current.get(d.id);
    if (!p) return;
    const { x, y } = toSvg(e);
    if (Math.abs(x - p.x) + Math.abs(y - p.y) > 3) d.moved = true;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    alphaRef.current = Math.max(alphaRef.current, 0.4);
    render();
  }
  function onPointerUp(id: string) {
    const d = dragRef.current;
    dragRef.current = { id: null, moved: false };
    if (d.id === id && !d.moved) router.push(`/items/${id}`);
  }

  const map = posRef.current;
  const degMax = Math.max(1, ...nodes.map((n) => n.degree));

  return (
    <div
      ref={wrapRef}
      className="life-card relative overflow-hidden h-[640px] select-none"
      style={{ touchAction: "none" }}
    >
      {/* faint radial backdrop */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 45%, color-mix(in oklch, var(--terra) 6%, transparent), transparent 75%)",
        }}
      />
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="relative block"
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = { id: null, moved: false };
        }}
      >
        {/* edges */}
        {edges.map((e, i) => {
          const a = map.get(e.source);
          const b = map.get(e.target);
          if (!a || !b) return null;
          const active =
            neighbours && (neighbours.has(e.source) && neighbours.has(e.target));
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "var(--terra)" : "var(--line-2)"}
              strokeWidth={active ? 1.6 : 1}
              strokeOpacity={neighbours ? (active ? 0.8 : 0.25) : 0.55}
            />
          );
        })}

        {/* nodes */}
        {nodes.map((n) => {
          const p = map.get(n.id);
          if (!p) return null;
          const r = 5 + (n.degree / degMax) * 9;
          const color = kindColor(n.kind);
          const dim = neighbours ? !neighbours.has(n.id) : false;
          const showLabel =
            (neighbours ? neighbours.has(n.id) : n.degree >= Math.max(3, degMax * 0.5)) ||
            hover === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x} ${p.y})`}
              style={{ cursor: "pointer", opacity: dim ? 0.3 : 1 }}
              onPointerDown={(e) => onPointerDown(e, n.id)}
              onPointerUp={() => onPointerUp(n.id)}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
            >
              {hover === n.id && (
                <circle r={r + 5} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} />
              )}
              <circle
                r={r}
                fill={color}
                stroke="var(--paper)"
                strokeWidth={2}
              />
              {showLabel && (
                <text
                  x={0}
                  y={r + 13}
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{
                    fill: "var(--ink)",
                    fontSize: 11,
                    fontWeight: 500,
                    paintOrder: "stroke",
                    stroke: "var(--paper)",
                    strokeWidth: 3,
                  }}
                >
                  {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <Legend kinds={[...new Set(nodes.map((n) => n.kind))]} />
    </div>
  );
}

function Legend({ kinds }: { kinds: string[] }) {
  if (kinds.length === 0) return null;
  return (
    <div className="absolute left-3 bottom-3 flex flex-wrap gap-x-3 gap-y-1 max-w-[80%]">
      {kinds.slice(0, 8).map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--muted)] capitalize"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: kindColor(k) }}
          />
          {k}
        </span>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="life-card p-10 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[56px] h-[56px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Waypoints size={24} strokeWidth={1.6} />
      </div>
      <div className="text-[18px] font-semibold text-[var(--ink)]">
        Nothing linked yet.
      </div>
      <p className="mt-1.5 text-[13.5px] text-[var(--muted)] max-w-md mx-auto leading-relaxed">
        Link items together by typing{" "}
        <code className="font-mono text-[12px] bg-[var(--paper-2)] border border-[var(--line)] rounded px-1.5 py-0.5 text-[var(--terra)]">
          [[Title]]
        </code>{" "}
        inside any note or item&apos;s body. The web of connections shows up
        here.
      </p>
    </div>
  );
}
