import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
type Row = { postal_code: string; fsa: string; visitors: number; ranked: number; signed: number; city_name: string | null; riding_name: string | null; covered: string; first_seen: string; last_seen: string };

export default async function Locations({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const show = sp.show ?? "uncovered";
  const rows = await q<Row>(`
    select v.postal_code, left(v.postal_code, 3) fsa, count(*)::int visitors,
      count(*) filter (where exists (select 1 from rankings r where r.voter_id=v.id))::int ranked,
      count(*) filter (where v.auth_user_id is not null)::int signed,
      coalesce(max(pc.result->>'cityName'), max(case v.city when 'nanaimo' then 'Nanaimo' when 'victoria' then 'Victoria' end)) city_name,
      coalesce(max(pc.result->>'ridingName'), initcap(replace(max(v.riding), '-', ' '))) riding_name,
      case when bool_or(v.city is not null) then 'local + provincial' when bool_or(v.riding is not null) then 'provincial only' else 'not covered' end covered,
      to_char(min(v.created_at) at time zone 'America/Vancouver', 'Mon DD') first_seen,
      to_char(max(v.last_seen) at time zone 'America/Vancouver', 'Mon DD') last_seen
    from voters v left join postal_cache pc on pc.postal_code = 'v2:' || v.postal_code
    where v.postal_code is not null group by v.postal_code order by visitors desc, v.postal_code`);
  const byCity = new Map<string, { visitors: number; codes: number; covered: string }>();
  for (const r of rows) {
    const k = r.city_name ?? "Unknown";
    const e = byCity.get(k) ?? { visitors: 0, codes: 0, covered: r.covered };
    e.visitors += r.visitors; e.codes++; byCity.set(k, e);
  }
  const cities = [...byCity.entries()].sort((a, b) => b[1].visitors - a[1].visitors);
  const shown = rows.filter((r) => show === "all" || (show === "uncovered" ? r.covered !== "local + provincial" : r.covered === "local + provincial"));
  return (
    <div>
      <h1>Locations entered</h1>
      <p className="small muted">Postal codes visitors entered, with the municipality they fall in (from the census subdivision). Use it to decide where to add coverage next. Street addresses are never stored.</p>
      <h2>By municipality</h2>
      <table className="adm" style={{ maxWidth: 720 }}>
        <thead><tr><th>Municipality</th><th>Visitors</th><th>Postal codes</th><th>Coverage</th></tr></thead>
        <tbody>{cities.map(([name, e]) => <tr key={name}><td><b>{name}</b></td><td>{e.visitors}</td><td>{e.codes}</td><td>{e.covered === "not covered" ? <span className="badge todo">Not covered</span> : e.covered === "provincial only" ? <span className="badge">Provincial only</span> : <span className="badge ok">Covered</span>}</td></tr>)}</tbody>
      </table>
      <h2 style={{ marginTop: 24 }}>By postal code</h2>
      <div className="seg" style={{ marginBottom: 10 }}>
        {[["uncovered", "Not fully covered"], ["covered", "Covered"], ["all", "All"]].map(([v, l]) => <a key={v} href={`?show=${v}`} className={show === v ? "on" : ""}>{l}</a>)}
      </div>
      <table className="adm">
        <thead><tr><th>Postal code</th><th>Municipality</th><th>Provincial riding</th><th>Coverage</th><th>Visitors</th><th>Ranked</th><th>Signed in</th><th>First</th><th>Last</th></tr></thead>
        <tbody>{shown.map((r) => (
          <tr key={r.postal_code}><td><b>{r.postal_code.slice(0, 3)} {r.postal_code.slice(3)}</b></td><td>{r.city_name ?? "Unknown"}</td><td>{r.riding_name ?? "—"}</td><td>{r.covered}</td><td>{r.visitors}</td><td>{r.ranked}</td><td>{r.signed}</td><td>{r.first_seen}</td><td>{r.last_seen}</td></tr>
        ))}</tbody>
      </table>
      {shown.length === 0 && <p className="muted small">Nothing here yet.</p>}
    </div>
  );
}
