import Link from "next/link";
import { q } from "@/lib/db";
import { setRequestStatus } from "../actions";
export const dynamic = "force-dynamic";
export default async function Requests() {
  const rows = await q<any>(`select r.*, c.name as cand_name from claim_requests r left join candidacies c on c.id=r.candidacy_id order by (r.status='new') desc, r.created_at desc limit 200`);
  return (
    <div>
      <h1>&quot;Is this you?&quot; and problem reports</h1>
      {rows.length === 0 && <p className="muted">No requests yet.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row between"><b>{r.cand_name ?? r.candidacy_id}</b><span className={`badge ${r.status === "new" ? "todo" : "done"}`}>{r.status}</span></div>
          <p className="small">From {r.name} · {r.email} · {new Date(r.created_at).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</p>
          {r.proof_url && <p className="small">Proof: <a href={r.proof_url} target="_blank" rel="noreferrer">{r.proof_url}</a></p>}
          <p style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
          <form action={setRequestStatus} className="row">
            <input type="hidden" name="id" value={r.id} />
            <select name="status" defaultValue={r.status} style={{ maxWidth: 180 }}><option>new</option><option>contacted</option><option>approved</option><option>declined</option><option>done</option></select>
            <input name="admin_note" type="text" defaultValue={r.admin_note ?? ""} placeholder="Note" style={{ maxWidth: 320 }} />
            <button className="btn small">Save</button>
            {r.candidacy_id && <Link className="btn ghost small" href={`/admin/candidates/${encodeURIComponent(r.candidacy_id)}`}>Edit candidate</Link>}
          </form>
        </div>
      ))}
    </div>
  );
}
