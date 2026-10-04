import Link from "next/link";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { SOURCE_LABEL } from "@/lib/data";
import { deletePosition, saveCandidate, savePosition } from "../../actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = { affsource: "An affiliation needs a source URL.", summary: "A position needs a summary." };
export default async function EditCand({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const id = decodeURIComponent((await params).id);
  const sp = await searchParams;
  const c = await one<any>(`select c.*, e.government_id from candidacies c join races r on r.id=c.race_id join elections e on e.id=r.election_id where c.id=$1`, [id]);
  if (!c) notFound();
  const [affs, issues, positions] = await Promise.all([
    q<any>(`select id, name, type from affiliations order by type, name`),
    q<any>(`select id, title from issues where government_id=$1 order by sort`, [c.government_id]),
    q<any>(`select * from positions where candidacy_id=$1 order by id`, [id]),
  ]);
  const types = Object.keys(SOURCE_LABEL);
  const PosForm = ({ p }: { p?: any }) => (
    <form action={savePosition} className="card">
      <input type="hidden" name="candidacy_id" value={id} />{p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid2">
        <div className="field"><label>Issue</label><select name="issue_id" defaultValue={p?.issue_id ?? ""}><option value="">(other topic)</option>{issues.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}</select></div>
        <div className="field"><label>Topic label</label><input name="topic" type="text" defaultValue={p?.topic ?? ""} /></div>
      </div>
      <div className="field"><label>Neutral summary <span className="hint">max ~25 words, never their exact words</span></label><textarea name="summary" defaultValue={p?.summary ?? ""} required /></div>
      <div className="grid2">
        <div className="field"><label>Source URL</label><input name="source_url" type="url" defaultValue={p?.source_url ?? ""} required /></div>
        <div className="field"><label>Source type</label><select name="source_type" defaultValue={p?.source_type ?? "candidate"}>{types.map((t) => <option key={t} value={t}>{SOURCE_LABEL[t]}</option>)}</select></div>
      </div>
      <div className="field"><label>Lean on the issue&apos;s question <span className="hint">-2 = strongly position A, +2 = strongly position B; blank = not tagged</span></label>
        <select name="lean" defaultValue={p?.lean ?? ""}><option value="">Not tagged</option><option value="-2">-2 (A)</option><option value="-1">-1</option><option value="0">0 (mixed)</option><option value="1">+1</option><option value="2">+2 (B)</option></select></div>
      <div className="row"><button className="btn small">{p ? "Save position" : "Add position"}</button></div>
    </form>
  );
  return (
    <div>
      <p className="small"><Link href={`/admin/candidates?race=${c.race_id}`}>← Race</Link> · <Link href={`/c/${encodeURIComponent(id)}`}>Public profile</Link></p>
      {sp.saved && <p className="notice info">Saved.</p>}
      {sp.err && <p className="notice">{ERR[sp.err] ?? "Check the form."}</p>}
      <form action={saveCandidate} className="card">
        <h1>{c.name}</h1>
        <input type="hidden" name="id" value={id} />
        <div className="grid2">
          <div className="field"><label>Name</label><input name="name" type="text" defaultValue={c.name} required /></div>
          <div className="field"><label>Ballot name</label><input name="ballot_name" type="text" defaultValue={c.ballot_name ?? ""} /></div>
          <div className="field"><label>Affiliation</label><select name="affiliation_id" defaultValue={c.affiliation_id ?? ""}><option value="">None</option>{affs.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type === "party" ? "party" : "elector org"})</option>)}</select></div>
          <div className="field"><label>Affiliation source URL</label><input name="affiliation_source" type="url" defaultValue={c.affiliation_source ?? ""} /></div>
          <div className="field"><label>Incumbent</label><select name="incumbent" defaultValue={c.incumbent === true ? "yes" : c.incumbent === false ? "no" : ""}><option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></div>
          <div className="field"><label>Status</label><select name="status" defaultValue={c.status}><option value="active">Active (confirmed)</option><option value="unconfirmed">Nomination not yet confirmed</option><option value="withdrawn">Withdrawn (hidden)</option></select></div>
          <div className="field"><label>Official website</label><input name="website" type="url" defaultValue={c.website ?? ""} /></div>
          <div className="field"><label><input type="checkbox" name="declared_independent" defaultChecked={c.declared_independent} /> Declared independent</label></div>
        </div>
        <div className="grid2">
          <div className="field"><label>Professional summary <span className="hint">max 35 words, neutral; shows once the whole race has one</span></label><textarea name="summary" defaultValue={c.summary ?? ""} /></div>
          <div className="field"><label>Summary source URL</label><input name="summary_source" type="url" defaultValue={c.summary_source ?? ""} /></div>
        </div>
        <div className="field"><label>Other links <span className="hint">one per line, &quot;Label | URL&quot;</span></label><textarea name="links" defaultValue={(c.links ?? []).map((l: any) => `${l.label} | ${l.url}`).join("\n")} /></div>
        <div className="field"><label>Profile sources <span className="hint">one URL per line</span></label><textarea name="sources" defaultValue={(c.sources ?? []).join("\n")} /></div>
        <button className="btn">Save candidate</button>
      </form>
      <h2 id="positions">Positions ({positions.length})</h2>
      {positions.map((p) => (
        <div key={p.id}>
          <PosForm p={p} />
          <form action={deletePosition} style={{ marginTop: -8, marginBottom: 16 }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="candidacy_id" value={id} /><button className="btn ghost small">Delete this position</button></form>
        </div>
      ))}
      <h3>Add a position</h3>
      <PosForm />
    </div>
  );
}
