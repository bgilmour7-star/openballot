import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { saveElection } from "../../actions";
export const dynamic = "force-dynamic";
export default async function EditElection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params; const sp = await searchParams;
  const e = await one<any>(`select *, to_char(voting_day,'YYYY-MM-DD') vd from elections where id=$1`, [id]);
  if (!e) notFound();
  return (
    <div>
      <p className="small"><Link href="/admin/elections">← Elections</Link></p>
      {sp.saved && <p className="notice info">Saved.</p>}{sp.err && <p className="notice">Advance voting must be valid JSON.</p>}
      <form action={saveElection} className="card">
        <h1>{e.name}</h1><input type="hidden" name="id" value={id} />
        <div className="grid2"><div className="field"><label>Voting day</label><input name="voting_day" type="date" defaultValue={e.vd} /></div>
          <div className="field"><label>Voting hours</label><input name="voting_hours" type="text" defaultValue={e.voting_hours ?? ""} /></div></div>
        <div className="field"><label>Advance voting <span className="hint">JSON list of {"{date, hours, locations[], note}"}</span></label><textarea name="advance_voting" style={{ minHeight: 160, fontFamily: "monospace", fontSize: 13 }} defaultValue={JSON.stringify(e.advance_voting, null, 1)} /></div>
        <div className="field"><label>How to vote</label><textarea name="how_to_vote" defaultValue={e.how_to_vote ?? ""} /></div>
        <div className="field"><label>By mail</label><textarea name="mail_ballot" defaultValue={e.mail_ballot ?? ""} /></div>
        <div className="field"><label>Official URL</label><input name="official_url" type="url" defaultValue={e.official_url ?? ""} /></div>
        <button className="btn">Save election</button>
      </form>
    </div>
  );
}
