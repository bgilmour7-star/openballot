import Link from "next/link";
import { q } from "@/lib/db";
import { reviewLean, approveAllNoSide } from "../actions";
export const dynamic = "force-dynamic";

type Row = { id: number; candidacy_id: string; cand_name: string; gov_id: string; gov_name: string; issue_title: string; question: string; pole_a: string; pole_b: string;
  summary: string; source_url: string | null; proposed_lean: number | null; lean: number | null; lean_state: string; lean_quote: string | null; lean_reason: string | null; lean_reviewed_by: string | null };

const SIDE: Record<string, string> = { "-2": "Strongly A", "-1": "Lean A", "0": "Both equally", "1": "Lean B", "2": "Strongly B", none: "No clear side" };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default async function Leans({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const show = sp.show ?? "proposed";
  const gov = sp.gov ?? "";
  const rows = await q<Row>(`
    select p.id, p.candidacy_id, c.name cand_name, g.id gov_id, g.name gov_name, i.title issue_title, i.question, i.pole_a, i.pole_b,
      p.summary, p.source_url, p.proposed_lean, p.lean, p.lean_state, p.lean_quote, p.lean_reason, p.lean_reviewed_by
    from positions p join candidacies c on c.id=p.candidacy_id join issues i on i.id=p.issue_id join governments g on g.id=i.government_id
    where p.lean_state is not null and ($1 = 'all' or p.lean_state = $1) and ($2 = '' or g.id = $2)
    order by g.name, i.sort, i.title, c.name limit 400`, [show, gov]);
  const counts = await q<{ lean_state: string; n: number; sided: number }>(`select lean_state, count(*)::int n, count(*) filter (where proposed_lean is not null)::int sided from positions where lean_state is not null group by 1`);
  const c = Object.fromEntries(counts.map((x) => [x.lean_state, x]));
  const govs = await q<{ id: string; name: string }>(`select id, name from governments order by name`);
  const qs = (o: Record<string, string>) => "?" + new URLSearchParams({ show, gov, ...o }).toString();
  const noSideWaiting = (c.proposed?.n ?? 0) - (c.proposed?.sided ?? 0);

  return (
    <div>
      <h1>Sides on issues</h1>
      <p className="muted" style={{ maxWidth: 760 }}>Research proposes where each statement falls on the issue&apos;s A/B question. Voters only see a side after you approve it, labelled as Openballot&apos;s reading with the statement and source. Only approve a side when the statement takes it explicitly; otherwise choose No clear side.</p>
      {sp.saved && <p className="notice info">Saved.</p>}
      <div className="row" style={{ gap: 8, flexWrap: "wrap", margin: "8px 0 16px" }}>
        <nav className="seg" aria-label="Status">
          {[["proposed", `To review (${c.proposed?.n ?? 0})`], ["approved", `Approved (${c.approved?.n ?? 0})`], ["rejected", `Hidden (${c.rejected?.n ?? 0})`], ["all", "All"]].map(([k, l]) =>
            <Link key={k} href={qs({ show: k })} className={show === k ? "on" : ""}>{l}</Link>)}
        </nav>
        <nav className="seg" aria-label="Government">
          <Link href={qs({ gov: "" })} className={gov === "" ? "on" : ""}>All</Link>
          {govs.map((g) => <Link key={g.id} href={qs({ gov: g.id })} className={gov === g.id ? "on" : ""}>{g.name.replace("School District", "SD").replace(/ \(.*\)/, "")}</Link>)}
        </nav>
      </div>
      {show === "proposed" && noSideWaiting > 0 && (
        <form action={approveAllNoSide} className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <p className="small" style={{ margin: 0, flex: 1 }}><b>{noSideWaiting} proposals say &quot;no clear side&quot;.</b> Approving these is low-risk: voters will see the statement with &quot;No clear side&quot;.</p>
          <button className="btn small">Approve all no-side proposals</button>
        </form>
      )}
      {rows.length === 0 && <p className="muted">Nothing here.</p>}
      {rows.map((r) => {
        const current = r.lean_state === "approved" ? r.lean : r.proposed_lean;
        const cur = current == null ? "none" : String(current);
        return (
          <form action={reviewLean} key={r.id} className="card">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="back" value={qs({})} />
            <div className="row between" style={{ alignItems: "baseline" }}>
              <div><b>{r.cand_name}</b> <span className="xs muted">· {r.gov_name} · {r.issue_title}</span></div>
              <span className={`badge ${r.lean_state === "approved" ? "ok" : r.lean_state === "proposed" ? "todo" : ""}`}>{r.lean_state === "proposed" ? `Proposed: ${SIDE[r.proposed_lean == null ? "none" : String(r.proposed_lean)]}` : r.lean_state === "approved" ? `Approved: ${SIDE[cur]}${r.lean_reviewed_by ? ` · ${r.lean_reviewed_by.split("@")[0]}` : ""}` : "Hidden"}</span>
            </div>
            <p className="small" style={{ margin: "6px 0 2px" }}><b>{r.question}</b></p>
            <p className="xs muted" style={{ margin: 0 }}>A: {r.pole_a} · B: {r.pole_b}</p>
            <p style={{ margin: "10px 0 4px" }}>{r.summary}</p>
            {r.lean_quote && <p className="small" style={{ margin: "0 0 4px" }}>&ldquo;{r.lean_quote}&rdquo;</p>}
            <p className="xs muted" style={{ margin: 0 }}>{r.source_url && <><a href={r.source_url} target="_blank" rel="noreferrer">{host(r.source_url)}</a> · </>}{r.lean_reason ? `Research note: ${r.lean_reason}` : ""} · <Link href={`/admin/candidates/${encodeURIComponent(r.candidacy_id)}`}>Edit candidate</Link></p>
            <fieldset className="side-pick-admin">
              <legend className="sr-only">Side</legend>
              {["-2", "-1", "none", "1", "2"].map((k) => (
                <label key={k}><input type="radio" name="side" value={k} defaultChecked={cur === k} /> {SIDE[k]}</label>
              ))}
            </fieldset>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn small" name="do" value="approve">{r.lean_state === "approved" ? "Update" : "Approve"}</button>
              <button className="btn ghost small" name="do" value="hide">Hide side</button>
            </div>
          </form>
        );
      })}
    </div>
  );
}
