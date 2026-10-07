import { one, q } from "./db";
import { adminEmails } from "./auth/server";
import { COVERED_RIDINGS } from "./location";

export const THRESHOLD = 5;

type Row = { voter_id: string; issue_ids: string[]; signed_in: boolean; referred_by: string | null; riding: string | null };
export type IssueStat = { id: string; n: number; top3: number; top3Pct: number; score: number; rank: number; views: number[] };
export type Layer = { n: number; issues: IssueStat[] };
export type Community = {
  scope: "area" | "riding" | "combined"; scopeLabel: string;
  signed: Layer; anon: Layer; refs: { source: string; n: number; pct: number }[];
};

async function cityFor(govId: string) {
  const m = await one<{ id: string }>(`select id from municipalities where gov_id=$1 or school_gov_id=$1 limit 1`, [govId]);
  return m?.id ?? null;
}

/** Rankings for a government from people located in its area. Admin and excluded accounts never count. */
async function rowsFor(govId: string, riding?: string | null): Promise<Row[]> {
  const city = await cityFor(govId);
  const params: unknown[] = [govId, adminEmails()];
  let where = `r.government_id=$1 and coalesce(v.exclude_from_results,false)=false and (v.email is null or lower(v.email) <> all($2))`;
  if (city) { params.push(city); where += ` and v.city=$${params.length}`; }
  else if (riding) { params.push(riding); where += ` and v.riding=$${params.length}`; }
  else { params.push(COVERED_RIDINGS); where += ` and v.riding = any($${params.length})`; }
  return q<Row>(`select r.voter_id, r.issue_ids, (v.auth_user_id is not null) as signed_in, v.referred_by, v.riding
    from rankings r join voters v on v.id=r.voter_id where ${where}`, params);
}

async function layer(rows: Row[], issueIds: string[]): Promise<Layer> {
  const n = rows.length;
  const stats: Record<string, IssueStat> = Object.fromEntries(issueIds.map((id) => [id, { id, n: 0, top3: 0, top3Pct: 0, score: 0, rank: 0, views: [0, 0, 0, 0, 0] }]));
  for (const r of rows) {
    const list = (r.issue_ids ?? []).filter((id) => stats[id]);
    const L = list.length;
    list.forEach((id, idx) => {
      const s = stats[id];
      s.n++;
      if (idx < 3) s.top3++;
      s.score += L > 1 ? (L - 1 - idx) / (L - 1) : 1; // 1st = 1, last = 0
    });
  }
  if (n) {
    const ids = rows.map((r) => r.voter_id);
    const vs = await q<{ issue_id: string; value: number; c: number }>(
      `select issue_id, value, count(*)::int c from views where voter_id = any($1) group by issue_id, value`, [ids]);
    for (const v of vs) if (stats[v.issue_id] && v.value >= -2 && v.value <= 2) stats[v.issue_id].views[v.value + 2] += v.c;
  }
  const list = Object.values(stats).map((s) => ({ ...s, top3Pct: n ? Math.round((s.top3 / n) * 100) : 0, score: s.n ? s.score / s.n : 0 }));
  list.sort((a, b) => b.score - a.score || b.top3Pct - a.top3Pct);
  list.forEach((s, i) => (s.rank = i + 1));
  return { n, issues: list };
}

export async function communityFor(govId: string, issueIds: string[], voterRiding?: string | null): Promise<Community> {
  let scope: Community["scope"] = "area";
  let scopeLabel = "Voters in this area";
  let rows: Row[];
  if (govId === "province-of-bc") {
    const riding = voterRiding && COVERED_RIDINGS.includes(voterRiding) ? voterRiding : null;
    const byRiding = riding ? await rowsFor(govId, riding) : [];
    if (riding && byRiding.filter((r) => r.signed_in).length >= THRESHOLD) {
      rows = byRiding; scope = "riding"; scopeLabel = "Voters in your riding";
    } else {
      rows = await rowsFor(govId, null); scope = "combined"; scopeLabel = "Voters in all ridings Openballot covers";
    }
  } else rows = await rowsFor(govId);
  const signedRows = rows.filter((r) => r.signed_in);
  const [signed, anon] = await Promise.all([layer(signedRows, issueIds), layer(rows.filter((r) => !r.signed_in), issueIds)]);
  const refCounts = new Map<string, number>();
  for (const r of signedRows) refCounts.set(r.referred_by ?? "direct", (refCounts.get(r.referred_by ?? "direct") ?? 0) + 1);
  const refs = [...refCounts.entries()].map(([source, c]) => ({ source, n: c, pct: signedRows.length ? Math.round((c / signedRows.length) * 100) : 0 }))
    .sort((a, b) => b.n - a.n);
  return { scope, scopeLabel, signed, anon, refs };
}

/** Agreement between two orderings, 0–100 (100 = identical order). Normalized Spearman footrule. */
export function agreement(a: IssueStat[], b: IssueStat[]) {
  const L = a.length;
  if (L < 2 || !b.length) return null;
  const rb = Object.fromEntries(b.map((s) => [s.id, s.rank]));
  const d = a.reduce((sum, s) => sum + Math.abs(s.rank - (rb[s.id] ?? L)), 0);
  const max = Math.floor((L * L) / 2);
  return Math.round((1 - d / max) * 100);
}
