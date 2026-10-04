import Link from "next/link";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { host } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function AffiliationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await one<any>(`select * from affiliations where id=$1`, [id]);
  if (!a) notFound();
  const gap = await one<{ n: number }>(`select count(*)::int n from affiliations where type=$1 and blurb is null`, [a.type]);
  const showBlurb = !!a.blurb && (gap?.n ?? 1) === 0;
  const members = await q<any>(`select c.id, c.name, c.incumbent, c.summary, r.office, r.area_name, r.id race_id, g.name gov, g.id gov_id,
      (select count(*) from candidacies x where x.race_id=r.id and x.status<>'withdrawn' and x.summary is null)::int missing
    from candidacies c join races r on r.id=c.race_id join elections e on e.id=r.election_id join governments g on g.id=e.government_id
    where c.affiliation_id=$1 and c.status <> 'withdrawn' order by g.sort, r.sort, c.name`, [id]);
  const byRace = members.reduce((m: Record<string, any[]>, x) => { (m[`${x.gov} · ${x.office}${x.gov_id === "province-of-bc" ? "" : ""}`] ||= []).push(x); return m; }, {});
  const typeLabel = a.type === "party" ? "Registered provincial party" : "Elector organization (local civic slate)";
  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your votes</Link></p>
      <header className="cand-hero">
        <p className="xs muted" style={{ margin: 0 }}>{typeLabel}</p>
        <h1 style={{ margin: "2px 0 6px" }}>{a.name}</h1>
      </header>
      <div className="profile-layout">
        <div>
          <section className="card">
            <h2>Endorsed candidates ({members.length})</h2>
            <p className="xs muted">Listed as they appear on official candidate lists. Being on this list says nothing about how these candidates compare to others.</p>
            {Object.entries(byRace).map(([race, list]) => (
              <div key={race} style={{ marginTop: 12 }}>
                <h3>{race}</h3>
                <ul className="cand-list">
                  {(list as any[]).map((m) => (
                    <li key={m.id}>
                      <Link className="cand-row" href={`/c/${encodeURIComponent(m.id)}`}>
                        <div className="cand-main">
                          <div className="cand-name">{m.name}</div>
                          <div className="cand-meta">{m.office !== race ? <span>{m.area_name}</span> : null}{m.incumbent ? <span>Incumbent</span> : null}</div>
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
    </div>
  );
}
