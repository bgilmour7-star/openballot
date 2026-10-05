import Link from "next/link";
import { q } from "@/lib/db";
import type { Position } from "@/lib/data";
import { alignment } from "@/lib/alignment";

/** Provincial context: how a vote for a local MLA relates to who becomes premier, plus every party running. */
export default async function PartiesPanel({ order = [], views = {} }: { order?: string[]; views?: Record<string, number> } = {}) {
  const parties = await q<{ id: string; name: string; leader: string | null; leader_riding: string | null; candidate_count: number | null }>(
    `select id, name, leader, leader_riding, candidate_count from affiliations where type='party' order by candidate_count desc nulls last, name`);
  // Party alignment across the voter's whole list: counts first; a single number only with enough shared issues.
  const aps = await q<{ affiliation_id: string; issue_id: string; lean: number | null }>(`select affiliation_id, issue_id, lean from affiliation_positions where issue_id is not null`);
  const viewCount = order.filter((id) => views[id] != null && views[id] !== 0).length;
  const alignOf = (pid: string) => alignment(
    aps.filter((p) => p.affiliation_id === pid).map((p, k) => ({ id: k, candidacy_id: pid, issue_id: p.issue_id, topic: null, summary: "", source_url: null, source_type: "party_platform", lean: p.lean, inherited: false }) as Position),
    order, views);
  return (
    <>
      <section>
        <h2 style={{ fontSize: 16 }}>How your vote works</h2>
        <p className="small">You vote for <b>one MLA</b> in your riding. The party that wins the most seats across BC usually forms government, and its leader becomes premier. Party leaders are only on the ballot in their own riding.</p>
      </section>
      <section style={{ marginTop: 12 }}>
        <h2 style={{ fontSize: 16 }}>Parties and leaders</h2>
        <p className="xs muted">Every party running candidates in this election. Listed by number of candidates, never by agreement.{viewCount === 0 && order.length ? " Add your views on the issues to see where each party's published positions match yours." : ""}</p>
        <ul className="party-list">
          {parties.map((p) => (
            <li key={p.id}>
              <Link href={`/a/${p.id}`} className="party-row">
                <span className="party-name">{p.name}</span>
                <span className="xs muted">{p.leader ? `Leader: ${p.leader}` : "Leader not listed"}{p.leader_riding ? ` · runs in ${p.leader_riding}` : ""}</span>
                {p.candidate_count != null && <span className="xs muted">{p.candidate_count} candidate{p.candidate_count === 1 ? "" : "s"} across BC</span>}
                {viewCount > 0 && (() => { const a = alignOf(p.id); return a.shared > 0
                  ? <span className="party-align"><b>{a.score != null ? `${a.score}% aligned · ` : ""}Same side on {a.agree} of {a.shared}</b> issues where you both have a side{a.includesTop ? ", including your #1" : ""}</span>
                  : <span className="xs muted">No published side on the issues you&apos;ve given a view on</span>; })()}
              </Link>
            </li>
          ))}
        </ul>
        <p className="xs muted">Candidate counts are as reported before nominations closed on Oct 3. Independents also run in some ridings.</p>
      </section>
    </>
  );
}
