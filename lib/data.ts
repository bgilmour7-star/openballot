import { q, one } from "./db";
import type { Voter } from "./voter";
import { COVERED_RIDINGS } from "./location";

export type Gov = { id: string; name: string; level: string; how_built: string | null };
export type Election = {
  id: string; government_id: string; name: string; level: string; voting_day: string | null; voting_hours: string | null;
  advance_voting: any[]; how_to_vote: string | null; mail_ballot: string | null; official_url: string | null; sources: string[];
};
export type Race = { id: string; election_id: string; office: string; seats: number; area: string; area_name: string; area_note: string | null };
export type Candidate = {
  id: string; race_id: string; name: string; ballot_name: string | null; incumbent: boolean | null;
  affiliation_id: string | null; affiliation_name: string | null; affiliation_type: string | null; affiliation_source: string | null;
  affiliation_website: string | null; declared_independent: boolean; website: string | null; links: { label: string; url: string }[];
  sources: string[]; status: string; nomination_note: string | null;
  summary: string | null; summary_source: string | null; affiliation_blurb: string | null; affiliation_platform: string | null; affiliation_leader: string | null; affiliation_leader_riding: string | null;
};
export type Issue = {
  id: string; government_id: string; title: string; description: string; what_it_affects: string; who_decides: string;
  question: string; pole_a: string; pole_b: string; sources: string[]; sort: number;
  tradeoffs: { context?: string; a: { gains: string[]; costs: string[] }; b: { gains: string[]; costs: string[] } } | null;
};
export type Position = { id: number; candidacy_id: string; issue_id: string | null; topic: string | null; summary: string; source_url: string | null; source_type: string; lean: number | null; lean_state?: string | null; lean_quote?: string | null; inherited?: boolean; affiliation_name?: string | null };

export const getGov = (id: string) => one<Gov>(`select * from governments where id=$1`, [id]);
export const getIssues = (govId: string) =>
  q<Issue>(`select * from issues where government_id=$1 and active order by sort, title`, [govId]);

/** The races a voter can vote in for one government. */
export async function racesFor(v: Pick<Voter, "city" | "riding">, govId: string): Promise<Race[]> {
  if (govId === "province-of-bc") {
    if (!v.riding || !COVERED_RIDINGS.includes(v.riding)) return [];
    return q<Race>(`select r.* from races r join elections e on e.id=r.election_id where e.government_id=$1 and r.area=$2 order by r.sort`, [govId, v.riding]);
  }
  return q<Race>(`select r.* from races r join elections e on e.id=r.election_id where e.government_id=$1 and r.area=$2 order by r.sort`, [govId, v.city]);
}
export const electionFor = (govId: string) => one<Election>(`select * from elections where government_id=$1 order by voting_day limit 1`, [govId]);

const CAND_SELECT = `select c.*, a.name as affiliation_name, a.type as affiliation_type, a.website as affiliation_website, a.blurb as affiliation_blurb, a.platform_url as affiliation_platform, a.leader as affiliation_leader, a.leader_riding as affiliation_leader_riding
  from candidacies c left join affiliations a on a.id=c.affiliation_id`;
export const candidatesForRaces = (raceIds: string[]) =>
  raceIds.length ? q<Candidate>(`${CAND_SELECT} where c.race_id = any($1) and c.status <> 'withdrawn'`, [raceIds]) : Promise.resolve([] as Candidate[]);
export const getCandidate = (id: string) => one<Candidate>(`${CAND_SELECT} where c.id=$1`, [id]);
/** A candidate's own positions plus their affiliation's positions (labelled as inherited). */
export const positionsFor = (candIds: string[]) =>
  candIds.length ? q<Position>(`
    select id, candidacy_id, issue_id, topic, summary, source_url, source_type,
        case when lean_state = 'approved' then lean end as lean, lean_state, case when lean_state = 'approved' then lean_quote end as lean_quote,
        false as inherited, null::text as affiliation_name
      from positions where candidacy_id = any($1)
    union all
    select -ap.id as id, c.id as candidacy_id, ap.issue_id, null as topic, ap.summary, ap.source_url, ap.source_type, ap.lean, 'approved' as lean_state, null::text as lean_quote,
        true as inherited, a.name as affiliation_name
      from candidacies c join affiliation_positions ap on ap.affiliation_id=c.affiliation_id join affiliations a on a.id=c.affiliation_id
      where c.id = any($1)
    order by inherited, id`, [candIds]) : Promise.resolve([] as Position[]);

export async function rankingFor(voterId: string | undefined, govId: string): Promise<string[] | null> {
  if (!voterId) return null;
  const r = await one<{ issue_ids: string[] }>(`select issue_ids from rankings where voter_id=$1 and government_id=$2`, [voterId, govId]);
  return r?.issue_ids ?? null;
}
export async function viewsFor(voterId: string | undefined): Promise<Record<string, number>> {
  if (!voterId) return {};
  const rows = await q<{ issue_id: string; value: number }>(`select issue_id, value from views where voter_id=$1`, [voterId]);
  return Object.fromEntries(rows.map((r) => [r.issue_id, r.value]));
}

/** Deterministic shuffle per visitor, so order is random but stable for that person. */
export function shuffleFor<T extends { id: string }>(items: T[], seed: string): T[] {
  const h = (s: string) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  return [...items].sort((a, b) => h(seed + a.id) - h(seed + b.id));
}

export type FitGroup = "strong" | "some" | "unknown";
export const FIT_LABEL: Record<FitGroup, string> = {
  strong: "Speaks to your top issues",
  some: "Speaks to some of them",
  unknown: "Not enough information yet",
};
/** Fit = how many of the voter's top 3 issues a candidate has sourced positions on; never a recommendation. */
export function fitFor(positions: Position[], top: string[], views: Record<string, number>) {
  const covered = new Set(positions.filter((p) => p.issue_id && top.includes(p.issue_id)).map((p) => p.issue_id!));
  let agree = 0, differ = 0;
  for (const p of positions) {
    if (!p.issue_id || p.lean == null || !top.includes(p.issue_id) || views[p.issue_id] == null || views[p.issue_id] === 0 || p.lean === 0) continue;
    if (Math.sign(p.lean) === Math.sign(views[p.issue_id])) agree++; else differ++;
  }
  const group: FitGroup = covered.size >= 2 ? "strong" : covered.size === 1 ? "some" : "unknown";
  return { group, covered: [...covered], agree, differ };
}

/** Where a candidate stands on one issue's A/B question, compared with the voter's view. Only approved sides count. */
export type Stance = { kind: "similar" | "different" | "their-side" | "no-side" | "none"; side?: "A" | "B"; strong?: boolean; inherited?: boolean };
export function stanceOn(positions: Position[], issueId: string, view: number | undefined): Stance {
  const ps = positions.filter((p) => p.issue_id === issueId);
  if (!ps.length) return { kind: "none" };
  const sided = (list: Position[]) => list.filter((p) => p.lean != null && p.lean !== 0);
  const own = sided(ps.filter((p) => !p.inherited));
  const use = own.length ? own : sided(ps);
  if (!use.length) return { kind: "no-side" };
  const total = use.reduce((a, p) => a + (p.lean as number), 0);
  if (total === 0) return { kind: "no-side" };
  const side = total < 0 ? "A" : "B";
  const strong = use.every((p) => Math.abs(p.lean as number) === 2);
  const inherited = !own.length;
  if (view == null || view === 0) return { kind: "their-side", side, strong, inherited };
  return { kind: Math.sign(view) === Math.sign(total) ? "similar" : "different", side, strong, inherited };
}
export function stanceText(st: Stance) {
  switch (st.kind) {
    case "similar": return "Similar to your view";
    case "different": return "Different from your view";
    case "their-side": return `Leans ${st.side}`;
    case "no-side": return "No clear side";
    default: return "Nothing on record";
  }
}
export const STANCE_LABEL: Record<Stance["kind"], string> = {
  similar: "Similar to your view", different: "Different from your view", "their-side": "Takes a side", "no-side": "No clear side", none: "Nothing on record",
};
/** The voter's own view as plain words, e.g. "Lean B · Grow more gradually". */
export function viewWords(issue: { pole_a: string; pole_b: string }, value: number | undefined) {
  if (value == null) return null;
  if (value === 0) return "Unsure, or in between";
  return `${Math.abs(value) === 2 ? "Strongly" : "Lean"} ${value < 0 ? "A" : "B"} · ${value < 0 ? issue.pole_a : issue.pole_b}`;
}

export const SOURCE_LABEL: Record<string, string> = {
  candidate: "Candidate's own statement",
  official_guide: "Official candidate guide",
  affiliation_platform: "Affiliation platform",
  party_platform: "Party platform",
  party_policy_page: "Party policy page",
  news: "News Q&A or coverage",
  other: "Other source",
};

export function fmtDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  if (!d) return "";
  const s = typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, day] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-CA", { ...opts, timeZone: "UTC" });
}
export function daysUntil(d: string | Date | null) {
  if (!d) return null;
  const s = typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const target = Date.parse(s + "T12:00:00-07:00");
  return Math.ceil((target - Date.now()) / 86400000);
}
export const host = (u?: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, "") : ""; } catch { return u ?? ""; } };
