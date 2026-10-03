import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { saveIssue } from "../../actions";
export const dynamic = "force-dynamic";
export default async function EditIssue({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const id = decodeURIComponent((await params).id);
  const sp = await searchParams;
  const i = await one<any>(`select * from issues where id=$1`, [id]);
  if (!i) notFound();
  const F = ({ n, l, area }: { n: string; l: string; area?: boolean }) => (
    <div className="field"><label>{l}</label>{area ? <textarea name={n} defaultValue={i[n] ?? ""} /> : <input name={n} type="text" defaultValue={i[n] ?? ""} />}</div>
  );
  return (
    <div>
      <p className="small"><Link href={`/admin/issues?gov=${i.government_id}`}>← Issues</Link></p>
      {sp.saved && <p className="notice info">Saved.</p>}
      <form action={saveIssue} className="card">
        <input type="hidden" name="id" value={id} />
        <F n="title" l="Title (an issue, not a solution)" /><F n="description" l="What it covers" area /><F n="what_it_affects" l="What it affects" area />
        <F n="who_decides" l="What this government can do" area /><F n="question" l="View question" /><F n="pole_a" l="Position A" /><F n="pole_b" l="Position B" />
        <div className="field"><label>Sources <span className="hint">one per line</span></label><textarea name="sources" defaultValue={(i.sources ?? []).join("\n")} /></div>
        <div className="grid2"><div className="field"><label>Sort order</label><input name="sort" type="number" defaultValue={i.sort} /></div>
          <div className="field"><label><input type="checkbox" name="active" defaultChecked={i.active} /> Show to voters</label></div></div>
        <button className="btn">Save issue</button>
      </form>
    </div>
  );
}
