import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { getCandidate, getIssues, host, positionsFor, SOURCE_LABEL } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const id = decodeURIComponent(raw);
  const c = await getCandidate(id);
  if (!c) notFound();
  const race = await one<{ office: string; area_name: string; government_id: string; gov_name: string; seats: number }>(
    `select r.office, r.area_name, r.seats, e.government_id, g.name as gov_name from races r join elections e on e.id=r.election_id join governments g on g.id=e.government_id where r.id=$1`, [c.race_id]);
  const [positions, issues] = await Promise.all([positionsFor([c.id]), getIssues(race!.government_id)]);
  const issueTitle = Object.fromEntries(issues.map((i) => [i.id, i.title]));
  const onIssues = positions.filter((p) => p.issue_id);
  const other = positions.filter((p) => !p.issue_id);
  const noStance = issues.filter((i) => !onIssues.some((p) => p.issue_id === i.id));

  return (
    <div className="wrap">
      <p className="small" style={{ margin: 0 }}><Link href={`/g/${race!.government_id}/candidates`}>← {race!.gov_name} candidates</Link></p>
      {sp.claimed && <p className="notice info" style={{ marginTop: 12 }}>Thanks. Your request was sent for review. We&apos;ll contact you through your campaign email.</p>}
      <div className="card" style={{ marginTop: 12 }}>
        <p className="xs muted" style={{ margin: 0 }}>{race!.office} · {race!.area_name}</p>
        <h1>{c.name}</h1>
        <div className="row small">
          {c.affiliation_name ? (
            <span className="aff">{c.affiliation_type === "party" ? "Party" : "Elector organization"}: {c.affiliation_name}</span>
          ) : null}
          {c.declared_independent && <span className="aff">Independent</span>}
          {c.incumbent && <span className="muted">Incumbent</span>}
          {c.status === "unconfirmed" && <span className="badge todo">Nomination not yet confirmed</span>}
        </div>
        {c.affiliation_source && <p className="xs muted" style={{ marginTop: 6 }}>Affiliation source: <a href={c.affiliation_source} target="_blank" rel="noreferrer">{host(c.affiliation_source)}</a></p>}
        <div className="row" style={{ marginTop: 8 }}>
          {c.website && <a className="btn secondary small" href={c.website} target="_blank" rel="noreferrer">Official site</a>}
          {c.links?.map((l) => <a key={l.url} className="btn ghost small" href={l.url} target="_blank" rel="noreferrer">{l.label || host(l.url)}</a>)}
        </div>
      </div>

      <div className="card">
        <h2>Positions on the issues</h2>
        <p className="xs muted">Neutral summaries of public statements, each linked to its source. Not the candidate&apos;s exact words.</p>
        {onIssues.length === 0 && <p className="muted">No sourced positions on this government&apos;s issues yet.</p>}
        {onIssues.map((p) => (
          <div className="pos" key={p.id}>
            <p className="xs muted" style={{ margin: 0, fontWeight: 700 }}>{issueTitle[p.issue_id!]}</p>
            <p style={{ margin: "2px 0" }}>{p.summary}</p>
            <p className="src">{SOURCE_LABEL[p.source_type] ?? "Source"}{p.source_url ? <> · <a href={p.source_url} target="_blank" rel="noreferrer">{host(p.source_url)}</a></> : null}</p>
          </div>
        ))}
        {other.length > 0 && <>
          <h3 style={{ marginTop: 16 }}>Other topics</h3>
          {other.map((p) => (
            <div className="pos" key={p.id}>
              {p.topic && <p className="xs muted" style={{ margin: 0, fontWeight: 700, textTransform: "capitalize" }}>{p.topic}</p>}
              <p style={{ margin: "2px 0" }}>{p.summary}</p>
              <p className="src">{SOURCE_LABEL[p.source_type] ?? "Source"}{p.source_url ? <> · <a href={p.source_url} target="_blank" rel="noreferrer">{host(p.source_url)}</a></> : null}</p>
            </div>
          ))}
        </>}
        {noStance.length > 0 && <p className="small muted" style={{ marginTop: 12 }}><b>No stance yet on:</b> {noStance.map((i) => i.title).join(" · ")}</p>}
      </div>

      <div className="card">
        <h2>Is this you?</h2>
        <p className="small muted">Candidates can ask to claim this profile and send corrections or positions with sources. Nothing changes until it&apos;s reviewed.</p>
        <Link className="btn secondary" href={`/c/${encodeURIComponent(c.id)}/claim`}>Claim this profile</Link>
      </div>
      <p className="xs muted">Sources for this profile: {(c.sources ?? []).map((s, k) => <a key={k} href={s} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{host(s)}</a>)} · <Link href={`/c/${encodeURIComponent(c.id)}/claim?problem=1`}>Report a problem</Link></p>
    </div>
  );
}
