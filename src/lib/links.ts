/**
 * Link graph. Items connect through `[[wiki links]]` in their body — a target
 * resolves to another item by id or (case-insensitive) title. This builds the
 * node/edge set for the Connections graph from the live item list.
 */
import type { StoredItem } from "@/lib/store/db";

export type GraphNode = {
  id: string;
  label: string;
  kind: string;
  degree: number;
};
export type GraphEdge = { source: string; target: string };

export function buildGraph(items: StoredItem[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const byId = new Map<string, StoredItem>();
  const byTitle = new Map<string, string>(); // lowercased title → id
  for (const it of items) {
    byId.set(it.id, it);
    const t = (it.title ?? "").trim().toLowerCase();
    if (t && !byTitle.has(t)) byTitle.set(t, it.id);
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const body = it.body ?? "";
    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const raw = m[1].trim();
      const targetId = byId.has(raw) ? raw : byTitle.get(raw.toLowerCase());
      if (!targetId || targetId === it.id) continue;
      const key = `${it.id}->${targetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: it.id, target: targetId });
    }
  }

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: GraphNode[] = [];
  for (const [id, deg] of degree) {
    const it = byId.get(id);
    if (!it) continue;
    nodes.push({
      id,
      label: (it.title ?? "untitled").trim() || "untitled",
      kind: it.kind,
      degree: deg,
    });
  }

  return { nodes, edges };
}

/**
 * Resolve the links for one item: `outgoing` = items this item's body links to
 * via [[…]], `incoming` = items whose body links back to this one (backlinks).
 */
export function linksFor(
  itemId: string,
  items: StoredItem[],
): { outgoing: StoredItem[]; incoming: StoredItem[] } {
  const { edges } = buildGraph(items);
  const byId = new Map(items.map((i) => [i.id, i]));
  const outIds = new Set<string>();
  const inIds = new Set<string>();
  for (const e of edges) {
    if (e.source === itemId) outIds.add(e.target);
    if (e.target === itemId) inIds.add(e.source);
  }
  const resolve = (ids: Set<string>) =>
    [...ids]
      .map((id) => byId.get(id))
      .filter((x): x is StoredItem => Boolean(x));
  return { outgoing: resolve(outIds), incoming: resolve(inIds) };
}
