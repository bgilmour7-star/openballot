import { q } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Audit() {
  const rows = await q<any>(`select * from audit_log order by created_at desc limit 300`);
  return (
    <div>
      <h1>Change log</h1>
      <table className="adm"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Change</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{new Date(r.created_at).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</td><td>{r.actor}</td><td>{r.action} {r.entity} <span className="xs muted">{r.entity_id}</span></td>
          <td><details><summary className="xs">show</summary><pre className="xs" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify({ before: r.before, after: r.after }, null, 1)}</pre></details></td></tr>)}</tbody></table>
    </div>
  );
}
