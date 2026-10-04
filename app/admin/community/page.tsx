import { q } from "@/lib/db";
import { agreement, communityFor, THRESHOLD } from "@/lib/community";
import { COVERED_RIDINGS } from "@/lib/location";
import { setExclude } from "../actions";

export const dynamic = "force-dynamic";
export default async function CommunityAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const govs = await q<{ id: string; name: string }>(`select id, name from governments order by sort, name`);
  const scopes: { label: string; gov: string; riding?: string | null }[] = [];
  for (const g of govs) {
    if (g.id === "province-of-bc") {
      scopes.push({ label: `${g.name} · all covered ridings`, gov: g.id, riding: null });
      for (const r of COVERED_RIDINGS) scopes.push({ label: `${g.name} · ${r}`, gov: g.id, riding: r });
    } else scopes.push({ label: g.name, gov: g.id });
  }
  const rows = await Promise.all(scopes.map(async (s) => {
    const issues = await q<{ id: string; title: string }>(`select id, title from issues where government_id=$1 and active`, [s.gov]);
    const title = Object.fromEntries(issues.map((i) => [i.id, i.title]));
    const c = await communityFor(s.gov, issues.map((i) => i.id), s.riding);
    const scopeOk = s.gov !== "province-of-bc" || (s.riding ? c.scope === "riding" || c.signed.n === 0 : true);
    return { ...s, c, scopeOk, title, agree: c.anon.n >= THRESHOLD && c.signed.n >= THRESHOLD ? agreement(c.signed.issues, c.anon.issues) : null, topRef: c.refs.find((r) => r.source !== "direct") };
  }));
  const excluded = await q<{ id: string; email: string }>(`select id, email from voters where exclude_from_results order by email`);
  return (
    <div>
      <h1>Community rankings</h1>
      <p className="small muted">Results show publicly at {THRESHOLD} signed-in rankings. Admin accounts and excluded voters never count. <a href="/admin/community/export">Download CSV</a></p>
      <table className="adm">
        <thead><tr><th>Area</th><th>Signed-in</th><th>Anonymous</th><th>Status</th><th>Top share link</th><th>Signed vs anon agreement</th><th>Top 3 (signed-in)</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.label}>
            <td>{r.label}{r.riding && r.c.scope !== "riding" ? <div className="xs muted">below threshold; public view uses combined</div> : null}</td>
            <td><b>{r.c.signed.n}</b></td><td>{r.c.anon.n}</td>
            <td>{r.c.signed.n >= THRESHOLD ? <span className="badge ok">Public</span> : <span className="badge todo">{r.c.signed.n}/{THRESHOLD}</span>}</td>
            <td>{r.topRef ? <span className={r.topRef.pct > 10 ? "badge todo" : ""}>{r.topRef.pct}%{r.topRef.pct > 10 ? " · review" : ""}</span> : "—"}</td>
            <td>{r.agree == null ? "—" : `${r.agree}%`}</td>
            <td className="xs">{r.c.signed.n ? r.c.signed.issues.slice(0, 3).map((s) => r.title[s.id]).join(" · ") : "—"}</td>
          </tr>))}</tbody>
      </table>
      <div className="card" style={{ marginTop: 16, maxWidth: 560 }}>
        <h2>Exclude an account from results</h2>
        <p className="small muted">For test accounts. Admin emails are excluded automatically.</p>
        {sp.saved && <p className="notice info">Saved.</p>}
        <form action={setExclude} className="row">
          <input name="email" type="email" placeholder="email@example.com" required style={{ maxWidth: 300 }} />
          <select name="exclude" style={{ maxWidth: 140 }}><option value="true">Exclude</option><option value="false">Include</option></select>
          <button className="btn small">Save</button>
        </form>
        {excluded.length > 0 && <p className="xs muted" style={{ marginTop: 8 }}>Excluded: {excluded.map((e) => e.email).join(", ")}</p>}
      </div>
    </div>
  );
}
