import Link from "next/link";
import NextBar from "@/components/NextBar";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { host, SOURCE_LABEL } from "@/lib/data";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";
export default async function AffiliationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await one<any>(`select * from affiliations where id=$1`, [id]);
  if (!a) notFound();
  const gap = await one<{ n: number }>(`select count(*)::int n from affiliations where type=$1 and blurb is null`, [a.type]);
  const showBlurb = !!a.blurb && (gap?.n ?? 1) === 0;
  const aps = await q<any>(`select ap.*, i.title, i.sort from affiliation_positions ap left join issues i on i.id=ap.issue_id where ap.affiliation_id=$1 order by i.sort`, [id]);
  const members = await q<any>(`select c.id, c.name, c.incumbent, c.summary, r.office, r.area_name, r.id race_id, g.name gov, g.id gov_id,
      (select count(*) from candidacies x where x.race_id=r.id and x.status<>'withdrawn' and x.summary is null)::int missing
    from candidacies c join races r on r.id=c.race_id join elections e on e.id=r.election_id join governments g on g.id=e.government_id
    where c.affiliation_id=$1 and c.status <> 'withdrawn' order by g.sort, r.sort, c.name`, [id]);
  const byRace = members.reduce((m: Record<string, any[]>, x) => { (m[x.gov_id === "province-of-bc" ? x.area_name : `${x.gov} · ${x.office}`] ||= []).push(x); return m; }, {});
  const typeLabel = a.type === "party" ? "Registered provincial party" : "Elector organization (local civic slate)";
  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your elections</Link></p>
      <header className="cand-hero">
        <p className="xs muted" style={{ margin: 0 }}>{typeLabel}</p>
        <h1 style={{ margin: "2px 0 6px" }}>{a.name}</h1>
        {a.leader && <p className="small muted" style={{ margin: 0 }}>Leader: <b>{a.leader}</b>{a.leader_riding ? ` · on the ballot in ${a.leader_riding}` : ""}{a.candidate_count ? ` · ${a.candidate_count} candidates across BC` : ""}</p>}
      </header>
      <p className="page-intro">{a.type === "party" ? "A provincial party: who leads it, the positions it has published, and its candidates in the ridings Openballot covers." : "A local slate of candidates running together: what it says it stands for, and who is running with it."}</p>
      <div className="profile-layout">
        <div className="stack">
          {(aps.length > 0 || a.positions_note) && (
            <section className="card">
              <h2>Positions on the issues</h2>
              {a.positions_note && <p className="xs muted">{a.positions_note}</p>}
              {aps.length === 0 && <p className="small muted">No published positions on these issues yet.</p>}
              {aps.map((p: any) => (
                <div className="pos" key={p.id}>
                  <p className="xs muted" style={{ margin: 0, fontWeight: 700 }}>{p.title}</p>
                  <p style={{ margin: "2px 0" }}>{p.summary}</p>
                  <p className="src">{SOURCE_LABEL[p.source_type] ?? "Source"}{p.source_url ? <> · <a href={p.source_url} target="_blank" rel="noreferrer">{host(p.source_url)}</a></> : null}</p>
                </div>
              ))}
            </section>
          )}
          <section className="card">
            <h2>{a.type === "party" ? `Candidates in ridings we cover (${members.length})` : `Endorsed candidates (${members.length})`}</h2>
            <p className="xs muted">Listed as they appear on official candidate lists. Being on this list says nothing about how these candidates compare to others.</p>
            {Object.entries(byRace).map(([race, list]) => (
              <div key={race} style={{ marginTop: 12 }}>
                <h3>{race}</h3>
                <ul className="cand-list">
                  {(list as any[]).map((m) => (
                    <li key={m.id}>
                      <Link className="cand-row" href={`/c/${encodeURIComponent(m.id)}`}>
                        <Avatar name={m.name} />
                        <div className="cand-main">
                          <div className="cand-name">{m.name}</div>
                          <div className="cand-meta">{m.incumbent ? <span>Incumbent</span> : null}</div>
                          {m.missing === 0 && m.summary && <p className="xs muted" style={{ margin: "4px 0 0" }}>{m.summary}</p>}
                        </div>
                        <span className="chev" aria-hidden>›</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
        <aside className="stack">
          <section className="card">
            <h2 style={{ fontSize: 16 }}>About {a.name}</h2>
            {showBlurb ? <p className="small">{a.blurb}</p> : <p className="small muted">Descriptions appear once every {a.type === "party" ? "party" : "elector organization"} has one, so none is shown before the others.</p>}
            {showBlurb && a.blurb_source && <p className="src">Source: <a href={a.blurb_source} target="_blank" rel="noreferrer">{host(a.blurb_source)}</a></p>}
            <div className="row" style={{ marginTop: 8 }}>
              {a.platform_url && <a className="btn secondary small" href={a.platform_url} target="_blank" rel="noreferrer">Platform</a>}
              {a.website && <a className="btn ghost small" href={a.website} target="_blank" rel="noreferrer">Website</a>}
            </div>
            {a.platform_note && <p className="xs muted" style={{ marginTop: 8 }}>{a.platform_note}</p>}
          </section>
          <section className="card small">
            <h2 style={{ fontSize: 16 }}>How affiliations work here</h2>
            <p className="muted">{a.type === "party" ? "Provincial candidates run for registered parties or as independents." : "In BC local elections, candidates can be endorsed by an elector organization, whose name can appear on the ballot."} Openballot shows an affiliation only when it&apos;s official, always as a plain label.</p>
            {a.source_url && <p className="src">Official source: <a href={a.source_url} target="_blank" rel="noreferrer">{host(a.source_url)}</a></p>}
          </section>
        </aside>
      </div>
      <NextBar
        status={<><b>{a.name}</b><span className="muted">{a.type === "party" ? "Registered provincial party" : "Local slate"}</span></>}
        primary={{ href: "/votes", label: "Your elections →" }} />
    </div>
  );
}
