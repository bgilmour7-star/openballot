import Link from "next/link";
import NextBar, { NbProgress } from "@/components/NextBar";
import { notFound } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { q } from "@/lib/db";
import { candidatesForRaces, fitFor, getGov, getIssues, positionsFor, racesFor, rankingFor, shuffleFor, viewsFor, type Race, type FitGroup } from "@/lib/data";
import GovTabs from "@/components/GovTabs";
import Avatar from "@/components/Avatar";
import PartiesPanel from "@/components/PartiesPanel";

export const dynamic = "force-dynamic";

const GROUPS: { key: FitGroup; label: string; hint: string }[] = [
  { key: "strong", label: "Speaks to most of your top issues", hint: "Sourced positions on 2 or 3 of them" },
  { key: "some", label: "Speaks to one of your top issues", hint: "A sourced position on 1 of them" },
  { key: "unknown", label: "Nothing on record yet for your top issues", hint: "No sourced position on any of them yet" },
];

export default async function CandidatesPage({ params, searchParams }: { params: Promise<{ gov: string }>; searchParams: Promise<Record<string, string>> }) {
  const { gov: govId } = await params;
  const sp = await searchParams;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const v = await getVoter();
  let races: Race[] = v ? await racesFor(v, govId) : [];
  let allAreas = false;
  if (!races.length) {
    races = await q<Race>(`select r.* from races r join elections e on e.id=r.election_id where e.government_id=$1 order by r.area, r.sort`, [govId]);
    allAreas = true;
  }
  const race = races.find((r) => r.id === sp.race) ?? races[0];
  const [cands, issues, ranking, views] = await Promise.all([candidatesForRaces(race ? [race.id] : []), getIssues(govId), rankingFor(v?.id, govId), viewsFor(v?.id)]);
  const counts = races.length > 1 ? await q<{ race_id: string; n: number }>(`select race_id, count(*)::int n from candidacies where race_id = any($1) and status <> 'withdrawn' group by race_id`, [races.map((r) => r.id)]) : [];
  const countOf = Object.fromEntries(counts.map((c) => [c.race_id, c.n]));
  const positions = await positionsFor(cands.map((c) => c.id));
  const issueTitle = Object.fromEntries(issues.map((i) => [i.id, i.title]));
  const top = (ranking ?? []).slice(0, 3);
  const seed = v?.id ?? "anon";
  const list = race ? shuffleFor(cands, seed + race.id) : [];
  const rows = list.map((c) => {
    const pos = positions.filter((p) => p.candidacy_id === c.id);
    const issueIds = [...new Set(pos.map((p) => p.issue_id).filter(Boolean) as string[])];
    const hits = issueIds.filter((t) => top.includes(t)).sort((a, b) => top.indexOf(a) - top.indexOf(b));
    const others = issueIds.filter((t) => !top.includes(t));
    return { c, pos, hits, others, fit: fitFor(pos, top, views) };
  });

  const Explainer = (
    <>
      <h2 style={{ fontSize: 16 }}>How candidates are grouped</h2>
      <p className="small">By how many of your top 3 issues each candidate has a <b>sourced position</b> on. It shows who has spoken to your issues, not who agrees with you. It&apos;s never a recommendation, and order within a group is random.</p>
      {ranking ? (
        <>
          <p className="xs muted" style={{ margin: "12px 0 6px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Your top 3</p>
          <ol className="top3">{top.map((t) => <li key={t} className="small"><b>{issueTitle[t]}</b></li>)}</ol>
          <Link className="small" href={`/g/${govId}`}>Change your ranking</Link>
        </>
      ) : null}
    </>
  );

  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your elections</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="candidates" />
      <p className="page-intro">Everyone running, grouped by how much they&apos;ve said about your top 3 issues. Groups are never a ranking or a recommendation. Tap a name to see their positions and where each came from.</p>
      <div className="cands-layout">
        <div>
          {!ranking && (
            <div className="notice" style={{ marginBottom: 16 }}>
              Rank the issues first and we&apos;ll group candidates by how much they&apos;ve said about your top three. <Link href={`/g/${govId}`}><b>Rank the issues</b></Link>
            </div>
          )}
          <details className="explainer-mobile card">
            <summary>How candidates are grouped{ranking ? " · your top 3" : ""}</summary>
            <div style={{ marginTop: 8 }}>{Explainer}</div>
          </details>

          {races.length > 1 && (
            <nav className="seg race-switch" aria-label="Choose a race">
              {races.map((r) => (
                <Link key={r.id} href={`?race=${r.id}`} className={r.id === race?.id ? "on" : ""} aria-current={r.id === race?.id ? "page" : undefined}>
                  {r.office}{allAreas && govId === "province-of-bc" ? ` · ${r.area_name}` : ""} <span className="count">{countOf[r.id] ?? ""}</span>
                </Link>
              ))}
            </nav>
          )}

          {race && (
            <section aria-labelledby="race-h">
              <div className="race-head">
                <h2 id="race-h">{race.office}{(allAreas || govId === "province-of-bc") && race.area_name ? <span className="muted"> · {race.area_name}</span> : null}</h2>
                <p className="small muted" style={{ margin: 0 }}>{list.length} candidates · {race.seats > 1 ? `${race.seats} seats, vote for up to ${race.seats}` : "1 seat"}</p>
              </div>

              {(ranking ? GROUPS : [{ key: "all" as any, label: "All candidates", hint: "Random order" }]).map((g) => {
                const inGroup = ranking ? rows.filter((x) => x.fit.group === g.key) : rows;
                if (!inGroup.length) return null;
                return (
                  <div key={g.key} className={`fit-group fit-${g.key}`}>
                    <div className="fit-head">
                      <span className="fit-dots" aria-hidden>{g.key === "strong" ? "●●" : g.key === "some" ? "●○" : "○○"}</span>
                      <h3>{g.label}</h3>
                      <span className="pill">{inGroup.length}</span>
                      <span className="xs muted fit-hint">{g.hint}</span>
                    </div>
                    <ul className="cand-list">
                      {inGroup.map(({ c, pos, hits, others, fit }) => (
                        <li key={c.id}>
                          <Link className="cand-row" href={`/c/${encodeURIComponent(c.id)}`}>
                            <Avatar name={c.name} />
                            <div className="cand-main">
                              <div className="cand-name">{c.name}</div>
                              <div className="cand-meta">
                                {c.affiliation_name && <span className="aff">{c.affiliation_name}</span>}
                                {c.declared_independent && <span className="aff">Independent</span>}
                                {c.incumbent && <span>Incumbent</span>}
                                {c.status === "unconfirmed" && <span className="badge todo">Nomination not yet confirmed</span>}
                              </div>
                              {hits.length + others.length > 0 ? (
                                <div className="chips">
                                  {hits.map((t) => <span key={t} className="chip hit">{issueTitle[t]}</span>)}
                                  {others.slice(0, 3).map((t) => <span key={t} className="chip">{issueTitle[t]}</span>)}
                                  {others.length > 3 && <span className="chip">+{others.length - 3} more</span>}
                                </div>
                              ) : (
                                <p className="xs muted" style={{ margin: "6px 0 0" }}>{pos.length ? "Positions on other topics only" : "No stance yet on any issue"}</p>
                              )}
                              {pos.some((p) => p.inherited) && <p className="xs muted" style={{ margin: "4px 0 0" }}>Includes {c.affiliation_type === "party" ? "party" : "slate"} positions</p>}
                              {fit.agree + fit.differ > 0 && <p className="xs muted" style={{ margin: "4px 0 0" }}>Where tagged: {fit.agree} similar to your view, {fit.differ} different</p>}
                            </div>
                            <span className="chev" aria-hidden>›</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}
          <NextBar
            status={ranking ? <><b>Grouped by your top 3</b><span className="muted">{top.map((t) => issueTitle[t]).join(" · ")}</span></> : <><b>Rank the issues first</b><span className="muted">Then candidates are grouped by what you care about.</span></>}
            links={ranking ? [{ href: `/g/${govId}`, label: "Change ranking" }] : []}
            primary={ranking ? { href: `/g/${govId}/community`, label: "Community →" } : { href: `/g/${govId}`, label: "Rank the issues →" }} />
        </div>
        <aside className="aside-stack">
          <div className="explainer-aside card">{Explainer}</div>
          {govId === "province-of-bc" && <div className="card parties-card"><PartiesPanel /></div>}
        </aside>
      </div>
    </div>
  );
}
