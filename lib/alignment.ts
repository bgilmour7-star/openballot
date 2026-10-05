import type { Position } from "./data";

/** The voter's whole issue list: their ranking first, then any issues they haven't placed, in default order. */
export function fullOrder(ranking: string[] | null, issueIds: string[]): string[] {
  const placed = (ranking ?? []).filter((id) => issueIds.includes(id));
  return [...placed, ...issueIds.filter((id) => !placed.includes(id))];
}

/** A candidate's approved side on one issue (own statements first, then party/slate), or null. -2..2, never 0. */
export function sideOn(positions: Position[], issueId: string): number | null {
  const ps = positions.filter((p) => p.issue_id === issueId && p.lean != null && p.lean !== 0);
  const own = ps.filter((p) => !p.inherited);
  const use = own.length ? own : ps;
  if (!use.length) return null;
  const avg = use.reduce((a, p) => a + (p.lean as number), 0) / use.length;
  return avg === 0 ? null : Math.max(-2, Math.min(2, avg));
}

/** Minimum number of issues where both the voter and the candidate have a side before a single number is shown. */
export const MIN_SCORED_ISSUES = 5;

export type Alignment = {
  shared: number;          // issues where both have a side
  agree: number;           // of those, same side
  score: number | null;    // 0-100, weighted by the voter's order; null until MIN_SCORED_ISSUES is met
  includesTop: boolean;    // agreement includes the voter's #1 issue
};

/**
 * Alignment across the voter's whole ranked list.
 * Weight: issue at position k of n gets weight n - k (your #1 counts most, your last still counts).
 * Per-issue closeness: 1 - |voter - candidate| / 4, so same side and same strength = 1, opposite extremes = 0.
 */
export function alignment(positions: Position[], order: string[], views: Record<string, number>): Alignment {
  const n = order.length;
  let wSum = 0, sSum = 0, shared = 0, agree = 0, includesTop = false;
  order.forEach((iid, k) => {
    const v = views[iid];
    const c = sideOn(positions, iid);
    if (v == null || v === 0 || c == null) return;
    shared++;
    const same = Math.sign(v) === Math.sign(c);
    if (same) { agree++; if (k === 0) includesTop = true; }
    const w = n - k;
    wSum += w;
    sSum += w * (1 - Math.abs(v - c) / 4);
  });
  const score = shared >= MIN_SCORED_ISSUES && wSum > 0 ? Math.round((sSum / wSum) * 100) : null;
  return { shared, agree, score, includesTop };
}

/** For a comparison: the first issue in the voter's order where candidates take different sides, and the first where only some have said anything. */
export function firstDifferences(byCand: { id: string; positions: Position[] }[], order: string[]) {
  let differ: string | null = null, partial: string | null = null;
  for (const iid of order) {
    const sides = byCand.map((c) => sideOn(c.positions, iid));
    const signs = new Set(sides.filter((s) => s != null).map((s) => Math.sign(s as number)));
    const spoke = byCand.map((c) => c.positions.some((p) => p.issue_id === iid));
    if (!differ && signs.size > 1) differ = iid;
    if (!partial && spoke.some(Boolean) && spoke.some((x) => !x)) partial = iid;
    if (differ && partial) break;
  }
  return { differ, partial };
}
