import Link from "next/link";
import NextBar from "@/components/NextBar";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { getCandidate, getIssues, host, positionsFor, rankingFor, SOURCE_LABEL, stanceOn, stanceText, viewsFor, viewWords, type Stance } from "@/lib/data";
import { alignment, fullOrder } from "@/lib/alignment";
import { getVoter } from "@/lib/voter";
import { flipFor } from "@/lib/flip";
import ViewDrawerButton from "@/components/ViewDrawerButton";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const id = decodeURIComponent(raw);
  const c = await getCandidate(id);
  if (!c) notFound();
  const race = await one<{ office: string; area_name: string; government_id: string; gov_name: string; seats: number }>(
    `select r.office, r.area_name, r.seats, e.government_id, g.name as gov_name from races r join elections e on e.id=r.election_id join governments g on g.id=e.government_id where r.id=$1`, [c.race_id]);
  const [positions, issues, completeness, members, blurbGap] = await Promise.all([
    positionsFor([c.id]),
    getIssues(race!.government_id),
    // Neutrality: background summaries show only once every candidate in the race has one.
    one<{ missing: number }>(`select count(*) filter (where summary is null)::int as missing from candidacies where race_id=$1 and status <> 'withdrawn'`, [c.race_id]),
    c.affiliation_id ? q<{ id: string; name: string; office: string }>(
      `select c.id, c.name, r.office from candidacies c join races r on r.id=c.race_id where c.affiliation_id=$1 and c.id<>$2 and c.status <> 'withdrawn' order by r.sort, c.name`, [c.affiliation_id, c.id]) : Promise.resolve([]),
    // Neutrality: affiliation descriptions show only once every affiliation of that type has one.
    c.affiliation_type ? one<{ n: number }>(`select count(*)::int n from affiliations where type=$1 and blurb is null`, [c.affiliation_type]) : Promise.resolve(null),
  ]);
  const showBlurb = !!c.affiliation_blurb && (blurbGap?.n ?? 1) === 0;
  const showSummary = (completeness?.missing ?? 1) === 0 && !!c.summary;
  const issueTitle = Object.fromEntries(issues.map((i) => [i.id, i.title]));
  const issueById = Object.fromEntries(issues.map((i) => [i.id, i]));
  // The voter's own inputs: their ranking orders everything below, and their views are compared with approved sides.
  const v = await getVoter();
  const [ranking, views] = await Promise.all([rankingFor(v?.id, race!.government_id), viewsFor(v?.id)]);
  const rankIdx = (issueId: string | null) => {
    if (!issueId) return 999;
    const k = ranking?.indexOf(issueId) ?? -1;
    return k >= 0 ? k : 100 + issues.findIndex((i) => i.id === issueId);
  };
  const top = (ranking ?? []).slice(0, 3).filter((id) => issueById[id]);
  const order = fullOrder(ranking, issues.map((i) => i.id));
  const restIds = ranking ? order.slice(3) : [];
  const align = alignment(positions, order, views);
  const firstName = c.name.split(" ")[0];
  const own = positions.filter((p) => !p.inherited);
  const party = positions.filter((p) => p.inherited && p.issue_id).sort((a, b) => rankIdx(a.issue_id) - rankIdx(b.issue_id));
  const onIssues = own.filter((p) => p.issue_id).sort((a, b) => rankIdx(a.issue_id) - rankIdx(b.issue_id));
  const other = own.filter((p) => !p.issue_id);
  const noStance = issues.filter((i) => !positions.some((p) => p.issue_id === i.id));
  const partyNote = c.affiliation_id ? await one<{ positions_note: string | null }>(`select positions_note from affiliations where id=$1`, [c.affiliation_id]) : null;
  const Pos = ({ p }: { p: (typeof positions)[number] }) => (
    <div className="pos">
      <p className="xs muted" style={{ margin: 0, fontWeight: 700, textTransform: p.issue_id ? "none" : "capitalize" }}>{p.issue_id ? issueTitle[p.issue_id] : p.topic}</p>
      <p style={{ margin: "2px 0" }}>{p.summary}</p>
      {p.issue_id && p.lean_state === "approved" && issueById[p.issue_id] && (
        <p className="reading">{p.lean == null || p.lean === 0 ? "Openballot's reading: no clear side on " : `Openballot's reading: ${Math.abs(p.lean) === 2 ? "strongly" : "leans"} ${p.lean < 0 ? "A" : "B"}, "${p.lean < 0 ? issueById[p.issue_id].pole_a : issueById[p.issue_id].pole_b}"`}{p.lean == null || p.lean === 0 ? `"${issueById[p.issue_id].question}"` : ""}</p>
      )}
      <p className="src">{SOURCE_LABEL[p.source_type] ?? "Source"}{p.source_url ? <> · <a href={p.source_url} target="_blank" rel="noreferrer">{host(p.source_url)}</a></> : null}</p>
    </div>
  );

  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href={`/g/${race!.government_id}/candidates`}>← {race!.gov_name} candidates</Link></p>
      {sp.claimed && <p className="notice info" style={{ marginTop: 12 }}>Thanks. Your request was sent for review. We&apos;ll contact you through your campaign email.</p>}
      <header className="cand-hero row" style={{ alignItems: "center", gap: 14, flexWrap: "nowrap" }}>
        <Avatar name={c.name} size={56} />
        <div>
        <p className="xs muted" style={{ margin: 0 }}>{race!.office} · {race!.area_name}</p>
        <h1 style={{ margin: "2px 0 6px" }}>{c.name}</h1>
        <div className="cand-meta" style={{ fontSize: 14 }}>
          {c.affiliation_name && c.affiliation_id && <Link className="aff" href={`/a/${c.affiliation_id}`}>{c.affiliation_name}</Link>}
          {c.declared_independent && <span className="aff">Independent</span>}
          {c.incumbent && <span>Incumbent</span>}
          {c.status === "unconfirmed" && <span className="badge todo">Nomination not yet confirmed</span>}
        </div>
        </div>
      </header>
      <p className="page-intro">This candidate&apos;s background and positions on the issues, each linked to where it was said. If nothing is on record for an issue, we say so.</p>

      <div className="profile-layout">
        <div>
          {top.length > 0 ? (
            <section className="card you-card" aria-labelledby="you-h">
              <h2 id="you-h">You and {firstName}</h2>
              <p className="xs muted" style={{ marginTop: 0 }}>Your top 3 issues, in your order.</p>
              <ol className="you-list">
                {top.map((iid, k) => {
                  const i = issueById[iid];
                  const st: Stance = stanceOn(positions, iid, views[iid]);
                  const theirs = positions.find((p) => p.issue_id === iid && !p.inherited) ?? positions.find((p) => p.issue_id === iid);
                  const mine = viewWords(i, views[iid]);
                  return (
                    <li key={iid} className="you-row">
                      <p className="you-issue"><span className="rank-num sm">{k + 1}</span>{i.title}</p>
                      <div className="you-grid">
                        <div>
                          <p className="you-k">You</p>
                          {mine
                            ? <div className="small">{mine} <ViewDrawerButton issue={i} rank={k + 1} flip={flipFor(v?.id ?? "anon", iid)} value={views[iid]} label="Change" className="linklike xs" /></div>
                            : <div className="small"><ViewDrawerButton issue={i} rank={k + 1} flip={flipFor(v?.id ?? "anon", iid)} value={undefined} label="Add your view" /> <span className="muted">to compare</span></div>}
                        </div>
                        <div>
                          <p className="you-k">{firstName}{theirs?.inherited ? ` (via ${theirs.affiliation_name})` : ""}</p>
                          {theirs ? <p className="small" style={{ margin: 0 }}>{theirs.summary}{theirs.source_url ? <> <a className="xs" href={theirs.source_url} target="_blank" rel="noreferrer">{host(theirs.source_url)}</a></> : null}</p> : <p className="small muted" style={{ margin: 0 }}>Nothing on record yet.</p>}
                        </div>
                      </div>
                      <p className={`stance st-${st.kind}`} style={{ margin: "8px 0 0" }}><span className="st-dot" aria-hidden /><span><b>{st.kind === "similar" ? "Similar to your view" : st.kind === "different" ? "Different from your view" : st.kind === "their-side" ? `Leans ${st.side}` : st.kind === "no-side" ? "No clear side on this question" : st.kind === "on-record" ? "Position on record, side not reviewed yet" : "Nothing on record"}</b>{st.kind === "similar" ? <span className="muted"> · you both lean {st.side}</span> : st.kind === "different" ? <span className="muted"> · {firstName} leans {st.side}{st.inherited ? " (party position)" : ""}</span> : st.kind === "their-side" ? <span className="muted"> · {st.side === "A" ? i.pole_a : i.pole_b}</span> : null}</span></p>
                    </li>
                  );
                })}
              </ol>
              {restIds.length > 0 && (
                <div className="you-rest">
                  <p className="you-k" style={{ marginBottom: 6 }}>The rest of your list</p>
                  <ul>
                    {restIds.map((iid) => { const st = stanceOn(positions, iid, views[iid]); return (
                      <li key={iid} className={`stance st-${st.kind}`}>
                        <span className="rest-rank">{order.indexOf(iid) + 1}</span>
                        <span className="st-dot" aria-hidden />
                        <span className="you-rest-t">{issueById[iid].title}</span>
                        <span className="you-rest-s">{stanceText(st)}</span>
                      </li>
                    ); })}
                  </ul>
                </div>
              )}
              <p className="align-line" style={{ margin: "0 0 10px" }}>
                {align.score != null
                  ? <><b>{align.score}% aligned across your whole list</b> <span className="muted">· based on {align.shared} issues where you both have a side, weighted by your order</span></>
                  : <span className="muted">An overall alignment number appears once {firstName} has a side on at least 5 of your issues{align.shared ? ` (${align.shared} so far)` : ""}.</span>}
              </p>
              <p className="xs muted" style={{ marginBottom: 0 }}>Sides are Openballot&apos;s reading of each statement, checked by a person. This is never a recommendation. Are you {c.name}? <Link href={`/c/${encodeURIComponent(c.id)}/claim`}>Claim this profile</Link> to correct a reading or state your side.</p>
            </section>
          ) : (
            <section className="card you-card">
              <h2>You and {firstName}</h2>
              <p className="small muted">Rank the issues for {race!.gov_name} and this section will compare {firstName}&apos;s positions with what matters to you.</p>
              <Link className="btn secondary small" href={`/g/${race!.government_id}`}>Rank the issues</Link>
            </section>
          )}
          <section className="card">
            <h2>Positions on the issues</h2>
            <p className="xs muted">Neutral summaries of public statements, each linked to its source. Not anyone&apos;s exact words.{top.length ? " Ordered by your ranking." : ""}</p>
            <h3 style={{ marginTop: 12 }}>{c.name}&apos;s own statements</h3>
            {onIssues.length === 0 && other.length === 0 && <p className="small muted">None on record yet.</p>}
            {onIssues.map((p) => <Pos key={p.id} p={p} />)}
            {other.length > 0 && <><p className="xs muted" style={{ margin: "12px 0 0", fontWeight: 700 }}>Other topics</p>{other.map((p) => <Pos key={p.id} p={p} />)}</>}
            {c.affiliation_id && (
              <>
                <h3 style={{ marginTop: 20 }}>Positions from {c.affiliation_name}</h3>
                <p className="xs muted" style={{ margin: "0 0 6px" }}>{c.affiliation_type === "party" ? "Party positions apply to all its candidates. MLAs usually vote with their party." : "Positions published by the elector organization for its endorsed candidates."}{partyNote?.positions_note ? ` ${partyNote.positions_note}` : ""}</p>
                {party.length === 0 ? <p className="small muted">No published positions on these issues yet.</p> : party.map((p) => <Pos key={p.id} p={p} />)}
              </>
            )}
            {noStance.length > 0 && <p className="small muted" style={{ marginTop: 12 }}><b>No stance yet on:</b> {noStance.map((i) => i.title).join(" · ")}</p>}
          </section>
        </div>

        <aside className="stack">
          <section className="card">
            <h2 style={{ fontSize: 16 }}>About</h2>
            {showSummary ? (
              <>
                <p className="small">{c.summary}</p>
                {c.summary_source && <p className="src">Source: <a href={c.summary_source} target="_blank" rel="noreferrer">{host(c.summary_source)}</a></p>}
              </>
            ) : (
              <p className="small muted">Background summaries for this race are being added. They appear for every candidate in a race at the same time.</p>
            )}
            <div className="row" style={{ marginTop: 8 }}>
              {c.website && <a className="btn secondary small" href={c.website} target="_blank" rel="noreferrer">Official site</a>}
              {c.links?.map((l) => <a key={l.url} className="btn ghost small" href={l.url} target="_blank" rel="noreferrer">{l.label || host(l.url)}</a>)}
            </div>
          </section>

          {c.affiliation_id && (
            <section className="card">
              <p className="xs muted" style={{ margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{c.affiliation_type === "party" ? "Party" : "Elector organization"}</p>
              <h2 style={{ fontSize: 18, margin: "2px 0 6px" }}>{c.affiliation_name}</h2>
              {c.affiliation_leader && <p className="small" style={{ margin: "0 0 8px" }}>Leader: <b>{c.affiliation_leader}</b>{c.affiliation_leader_riding ? <span className="muted"> · on the ballot in {c.affiliation_leader_riding}</span> : null}</p>}
              {showBlurb ? <p className="small">{c.affiliation_blurb}</p> : <p className="small muted">A short description is being added.</p>}
              {members.length > 0 && <p className="small"><b>Also endorsed:</b> {members.slice(0, 6).map((m) => m.name).join(", ")}{members.length > 6 ? ` and ${members.length - 6} more` : ""}</p>}
              <Link className="btn secondary small" href={`/a/${c.affiliation_id}`}>About {c.affiliation_name}</Link>
              {c.affiliation_source && <p className="src" style={{ marginTop: 8 }}>Affiliation source: <a href={c.affiliation_source} target="_blank" rel="noreferrer">{host(c.affiliation_source)}</a></p>}
            </section>
          )}

          <section className="card">
            <h2 style={{ fontSize: 16 }}>Is this you?</h2>
            <p className="small muted">Candidates can claim this profile and send corrections or positions with sources. Nothing changes until it&apos;s reviewed.</p>
            <Link className="btn secondary small" href={`/c/${encodeURIComponent(c.id)}/claim`}>Claim this profile</Link>
          </section>
          <p className="xs muted">Profile sources: {(c.sources ?? []).map((s, k) => <a key={k} href={s} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{host(s)}</a>)} · <Link href={`/c/${encodeURIComponent(c.id)}/claim?problem=1`}>Report a problem</Link></p>
        </aside>
      </div>
      <NextBar
        status={<><b>{race!.office}</b><span className="muted">{race!.gov_name}{race!.seats > 1 ? ` · vote for up to ${race!.seats}` : ""}</span></>}
        links={c.affiliation_id ? [{ href: `/a/${c.affiliation_id}`, label: `About ${c.affiliation_name}` }] : []}
        primary={{ href: `/g/${race!.government_id}/candidates?race=${c.race_id}`, label: "Other candidates →" }} />
    </div>
  );
}
