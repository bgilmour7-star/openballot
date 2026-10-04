import { currentAdmin } from "@/lib/auth/server";
import { q } from "@/lib/db";
import { communityFor } from "@/lib/community";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await currentAdmin())) return new Response("Not authorized", { status: 401 });
  const govs = await q<{ id: string; name: string }>(`select id, name from governments order by sort, name`);
  const lines = ["government,layer,rank,issue,voters,top3_count,top3_pct,score,view_minus2,view_minus1,view_0,view_plus1,view_plus2"];
  for (const g of govs) {
    const issues = await q<{ id: string; title: string }>(`select id, title from issues where government_id=$1 and active`, [g.id]);
    const title = Object.fromEntries(issues.map((i) => [i.id, i.title]));
    const c = await communityFor(g.id, issues.map((i) => i.id), null);
    for (const [layer, L] of [["signed_in", c.signed], ["anonymous", c.anon]] as const)
      for (const s of L.issues)
        lines.push([g.name, layer, s.rank, `"${(title[s.id] ?? s.id).replace(/"/g, '""')}"`, L.n, s.top3, s.top3Pct, s.score.toFixed(3), ...s.views].join(","));
  }
  return new Response(lines.join("\n"), { headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=openballot-community.csv" } });
}
