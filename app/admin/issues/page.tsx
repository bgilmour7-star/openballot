import Link from "next/link";
import { q, one } from "@/lib/db";
import { saveHowBuilt } from "../actions";
export const dynamic = "force-dynamic";
export default async function Issues({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const govs = await q<any>(`select * from governments order by sort, name`);
  const gov = sp.gov ?? govs[0].id;
  const g = await one<any>(`select * from governments where id=$1`, [gov]);
  const issues = await q<any>(`select i.*, (select count(*) from positions p where p.issue_id=i.id)::int npos from issues i where government_id=$1 order by sort`, [gov]);
  return (
    <div>
      <h1>Issues</h1>
      <div className="row" style={{ marginBottom: 12 }}>{govs.map((x) => <Link key={x.id} className={`btn small ${x.id === gov ? "" : "secondary"}`} href={`/admin/issues?gov=${x.id}`}>{x.name}</Link>)}</div>
      <table className="adm"><thead><tr><th>#</th><th>Issue</th><th>Question</th><th>Positions</th><th>Active</th></tr></thead>
        <tbody>{issues.map((i) => <tr key={i.id}><td>{i.sort}</td><td><Link href={`/admin/issues/${encodeURIComponent(i.id)}`}>{i.title}</Link></td><td className="small">{i.question}</td><td>{i.npos}</td><td>{i.active ? "yes" : "no"}</td></tr>)}</tbody></table>
      <form action={saveHowBuilt} className="card" style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={gov} />
        <label>&quot;How this list was built&quot; for {g?.name}</label>
        <textarea name="how_built" defaultValue={g?.how_built ?? ""} style={{ minHeight: 160 }} />
        <button className="btn small" style={{ marginTop: 8 }}>Save</button>
      </form>
    </div>
  );
}
