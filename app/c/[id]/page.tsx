import Link from "next/link";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { getCandidate, getIssues, host, positionsFor, SOURCE_LABEL } from "@/lib/data";
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
  const own = positions.filter((p) => !p.inherited);
  const party = positions.filter((p) => p.inherited && p.issue_id).sort((a, b) => issues.findIndex((i) => i.id === a.issue_id) - issues.findIndex((i) => i.id === b.issue_id));
  const onIssues = own.filter((p) => p.issue_id);
  const other = own.filter((p) => !p.issue_id);
  const noStance = issues.filter((i) => !positions.some((p) => p.issue_id === i.id));
  const partyNote = c.affiliation_id ? await one<{ positions_note: string | null }>(`select positions_note from affiliations where id=$1`, [c.affiliation_id]) : null;
  const Pos = ({ p }: { p: (typeof positions)[number] }) => (
    <div className="pos">
      <p className="xs muted" style={{ margin: 0, fontWeight: 700, textTransform: p.issue_id ? "none" : "capitalize" }}>{p.issue_id ? issueTitle[p.issue_id] : p.topic}</p>
      <p style={{ margin: "2px 0" }}>{p.summary}</p>
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

      <div className="profile-layout">
        <div>
          <section className="card">
            <h2>Positions on the issues</h2>
            <p className="xs muted">Neutral summaries of public statements, each linked to its source. Not anyone&apos;s exact words.</p>
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
    </div>
  );
}
