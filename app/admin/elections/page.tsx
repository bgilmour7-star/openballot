import Link from "next/link";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Elections() {
  const rows = await q<any>(`select e.id, e.name, e.voting_day, g.name gov from elections e join governments g on g.id=e.government_id order by voting_day, g.sort`);
  return (<div><h1>Elections</h1><table className="adm"><tbody>{rows.map((r) => <tr key={r.id}><td><Link href={`/admin/elections/${r.id}`}>{r.name}</Link></td><td>{r.gov}</td><td>{String(r.voting_day).slice(0, 15)}</td></tr>)}</tbody></table></div>);
}
