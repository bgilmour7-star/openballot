import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { q } from "@/lib/db";
import { candidatesForRaces, FIT_LABEL, fitFor, getGov, getIssues, positionsFor, racesFor, rankingFor, shuffleFor, viewsFor, type Race, type FitGroup } from "@/lib/data";
import GovTabs from "@/components/GovTabs";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({ params }: { params: Promise<{ gov: string }> }) {
  const { gov: govId } = await params;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const v = await getVoter();
  let races: Race[] = v ? await racesFor(v, govId) : [];
  let allAreas = false;
  if (!races.length) {
    races = await q<Race>(`select r.* from races r join elections e on e.id=r.election_id where e.government_id=$1 order by r.area, r.sort`, [govId]);
    allAreas = true;
  }
  const [cands, issues, ranking, views] = await Promise.all([candidatesForRaces(races.map((r) => r.id)), getIssues(govId), rankingFor(v?.id, govId), viewsFor(v?.id)]);
  const positions = await positionsFor(cands.map((c) => c.id));
  const issueTitle = Object.fromEntries(issues.map((i) => [i.id, i.title]));
  const top = (ranking ?? []).slice(0, 3);
  const seed = v?.id ?? "anon";

  return (
    <div className="wrap">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your votes</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="candidates" />
      {!ranking ? (
        <p className="notice">Rank the issues first and we&apos;ll group candidates by how much they&apos;ve said about your top three. <Link href={`/g/${govId}`}><b>Rank the issues</b></Link></p>
      ) : (
        <p className="notice info">Grouped by how many of your top issues ({top.map((t) => issueTitle[t]).join(", ")}) each candidate has a sourced position on. This shows who has spoken to them, not who agrees with you, and it&apos;s never a recommendation. Order within each group is random.</p>
      )}
      {allAreas && govId === "province-of-bc" && <p className="small muted">Showing every riding we cover. <Link href="/">Enter your postal code</Link> to see just yours.</p>}
      {races.map((race) => {
        const list = shuffleFor(cands.filter((c) => c.race_id === race.id), seed + race.id);
        const withFit = list.map((c) => ({ c, pos: positions.filter((p) => p.candidacy_id === c.id), fit: fitFor(positions.filter((p) => p.candidacy_id === c.id), top, views) }));
        const groups: FitGroup[] = ranking ? ["strong", "some", "unknown"] : ["unknown"];
        return (
          <section key={race.id} className="card">
            <h2>{race.office}{allAreas && race.area_name ? <span className="muted"> · {race.area_name}</span> : null}</h2>
            <p className="small muted" style={{ margin: 0 }}>{list.length} candidates{race.seats > 1 ? ` for ${race.seats} seats. You can vote for up to ${race.seats}.` : " for 1 seat."}</p>
            {groups.map((g) => {
              const inGroup = ranking ? withFit.filter((x) => x.fit.group === g) : withFit;
              if (!inGroup.length) return null;
              return (
                <div key={g}>
                  {ranking && <div className="group-head"><h3 style={{ margin: 0 }}>{FIT_LABEL[g]}</h3><span className="xs muted">{inGroup.length}</span></div>}
                  <ul className="list">
                    {inGroup.map(({ c, pos, fit }) => {
                      const topics = [...new Set(pos.map((p) => p.issue_id).filter(Boolean) as string[])];
                      return (
                        <li key={c.id} className="cand">
                          <div style={{ minWidth: 0 }}>
                            <h3><Link href={`/c/${encodeURIComponent(c.id)}`}>{c.name}</Link></h3>
                            <div className="row xs muted">
                              {c.affiliation_name && <span className="aff">{c.affiliation_name}</span>}
                              {c.declared_independent && <span className="aff">Independent</span>}
                              {c.incumbent && <span>Incumbent</span>}
                              {c.status === "unconfirmed" && <span className="badge todo">Nomination not yet confirmed</span>}
                            </div>
                            {topics.length > 0 ? (
                              <div className="chips">{topics.map((t) => <span key={t} className={`chip ${top.includes(t) ? "hit" : ""}`}>{issueTitle[t] ?? t}</span>)}</div>
                            ) : (
                              <p className="xs muted" style={{ margin: "4px 0 0" }}>{pos.length ? "Has positions on other topics" : "No stance yet"}</p>
                            )}
                            {fit.agree + fit.differ > 0 && <p className="xs muted" style={{ margin: "4px 0 0" }}>Where tagged: {fit.agree} similar to your view, {fit.differ} different</p>}
                          </div>
                          <Link className="btn secondary small" href={`/c/${encodeURIComponent(c.id)}`}>View</Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
