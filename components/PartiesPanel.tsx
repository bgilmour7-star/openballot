import Link from "next/link";
import { q } from "@/lib/db";

/** Provincial context: how a vote for a local MLA relates to who becomes premier, plus every party running. */
export default async function PartiesPanel() {
  const parties = await q<{ id: string; name: string; leader: string | null; leader_riding: string | null; candidate_count: number | null }>(
    `select id, name, leader, leader_riding, candidate_count from affiliations where type='party' order by candidate_count desc nulls last, name`);
  return (
    <>
      <section>
        <h2 style={{ fontSize: 16 }}>How your vote works</h2>
        <p className="small">You vote for <b>one MLA</b> in your riding. The party that wins the most seats across BC usually forms government, and its leader becomes premier. Party leaders are only on the ballot in their own riding.</p>
      </section>
      <section style={{ marginTop: 12 }}>
        <h2 style={{ fontSize: 16 }}>Parties and leaders</h2>
        <p className="xs muted">Every party running candidates in this election. Listed by number of candidates.</p>
        <ul className="party-list">
          {parties.map((p) => (
            <li key={p.id}>
              <Link href={`/a/${p.id}`} className="party-row">
                <span className="party-name">{p.name}</span>
                <span className="xs muted">{p.leader ? `Leader: ${p.leader}` : "Leader not listed"}{p.leader_riding ? ` · runs in ${p.leader_riding}` : ""}</span>
                {p.candidate_count != null && <span className="xs muted">{p.candidate_count} candidate{p.candidate_count === 1 ? "" : "s"} across BC</span>}
              </Link>
            </li>
          ))}
        </ul>
        <p className="xs muted">Candidate counts are as reported before nominations closed on Oct 3. Independents also run in some ridings.</p>
      </section>
    </>
  );
}
