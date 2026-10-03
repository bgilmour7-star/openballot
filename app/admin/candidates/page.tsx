import Link from "next/link";
import { q } from "@/lib/db";
import { addCandidate } from "../actions";
export const dynamic = "force-dynamic";
export default async function Cands({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const races = await q<any>(`select r.id, r.office, r.area_name, g.name gov from races r join elections e on e.id=r.election_id join governments g on g.id=e.government_id order by g.sort, g.name, r.area, r.sort`);
  const race = sp.race ?? races[0]?.id;
  const cands = await q<any>(`select c.id, c.name, c.status, a.name aff, (select count(*) from positions p where p.candidacy_id=c.id)::int npos,
    (select count(*) from positions p where p.candidacy_id=c.id and p.lean is not null)::int nlean
    from candidacies c left join affiliations a on a.id=c.affiliation_id where c.race_id=$1 order by c.name`, [race]);
  return (
    <div>
      <h1>Candidates</h1>
      <form className="row" style={{ marginBottom: 12 }}>
        <select name="race" defaultValue={race} style={{ maxWidth: 460 }}>{races.map((r) => <option key={r.id} value={r.id}>{r.gov} · {r.office} · {r.area_name}</option>)}</select>
        <button className="btn small">Show</button>
      </form>
      <table className="adm"><thead><tr><th>Name</th><th>Affiliation</th><th>Status</th><th>Positions</th><th>Tagged lean</th></tr></thead>
        <tbody>{cands.map((c) => <tr key={c.id}><td><Link href={`/admin/candidates/${encodeURIComponent(c.id)}`}>{c.name}</Link></td><td>{c.aff ?? ""}</td><td>{c.status}</td><td>{c.npos}</td><td>{c.nlean}</td></tr>)}</tbody></table>
      <form action={addCandidate} className="card" style={{ marginTop: 16, maxWidth: 520 }}>
        <h2>Add a candidate to this race</h2>
        <input type="hidden" name="race_id" value={race} />
        <div className="field"><label>Name</label><input name="name" type="text" required /></div>
        <div className="field"><label>Sources <span className="hint">one URL per line</span></label><textarea name="sources" required /></div>
        <button className="btn small">Add</button>
      </form>
    </div>
  );
}
