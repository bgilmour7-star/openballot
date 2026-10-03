import { q } from "@/lib/db";
import { saveAffiliation } from "../actions";
export const dynamic = "force-dynamic";
export default async function Affs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const rows = await q<any>(`select a.*, (select count(*) from candidacies c where c.affiliation_id=a.id)::int n from affiliations a order by type, name`);
  const Form = ({ a }: { a?: any }) => (
    <form action={saveAffiliation} className="card">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid2">
        <div className="field"><label>Name</label><input name="name" type="text" defaultValue={a?.name ?? ""} required /></div>
        <div className="field"><label>Type</label><select name="type" defaultValue={a?.type ?? "party"}><option value="party">Registered party (provincial)</option><option value="elector_organization">Elector organization (local)</option></select></div>
        <div className="field"><label>Official source <span className="hint">registration, ballot or candidate list</span></label><input name="source_url" type="url" defaultValue={a?.source_url ?? ""} required /></div>
        <div className="field"><label>Website</label><input name="website" type="url" defaultValue={a?.website ?? ""} /></div>
        <div className="field"><label>Platform URL</label><input name="platform_url" type="url" defaultValue={a?.platform_url ?? ""} /></div>
        <div className="field"><label>Platform note</label><input name="platform_note" type="text" defaultValue={a?.platform_note ?? ""} /></div>
      </div>
      <button className="btn small">{a ? `Save ${a.name}` : "Add affiliation"}</button>{a && <span className="xs muted"> · {a.n} candidates</span>}
    </form>
  );
  return (<div><h1>Affiliations</h1>{sp.saved && <p className="notice info">Saved.</p>}{sp.err && <p className="notice">An affiliation needs an official source.</p>}
    {rows.map((a) => <Form key={a.id} a={a} />)}<h2>Add</h2><Form /></div>);
}
