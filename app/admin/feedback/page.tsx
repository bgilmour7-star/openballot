import { q } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Feedback() {
  const rows = await q<any>(`select * from feedback order by created_at desc limit 300`);
  return (
    <div>
      <h1>Feedback</h1>
      <table className="adm"><thead><tr><th>When</th><th>Page</th><th>Message</th><th>Email</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{new Date(r.created_at).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</td><td>{r.page}</td><td style={{ whiteSpace: "pre-wrap" }}>{r.message}</td><td>{r.email}</td></tr>)}</tbody></table>
    </div>
  );
}
