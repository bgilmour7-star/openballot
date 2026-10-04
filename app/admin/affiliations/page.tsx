import Link from "next/link";
import { q } from "@/lib/db";
import { saveAffiliation } from "../actions";
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { party: "Registered party", elector_organization: "Elector organization" };

export default async function Affs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const type = sp.type ?? "";
  const gov = sp.gov ?? "";
  const govs = await q<any>(`select id, name from governments order by sort, name`);
  const rows = await q<any>(`
    select a.*,
      coalesce(json_agg(distinct jsonb_build_object('gov', g.name, 'gov_id', g.id, 'race', r.office, 'area', r.area_name)) filter (where c.id is not null), '[]') as links,
      count(c.id)::int as n
    from affiliations a
    left join candidacies c on c.affiliation_id=a.id and c.status <> 'withdrawn'
    left join races r on r.id=c.race_id left join elections e on e.id=r.election_id left join governments g on g.id=e.government_id
    group by a.id order by a.type, a.name`);
  const shown = rows.filter((a) => (!type || a.type === type) && (!gov || a.links.some((l: any) => l.gov_id === gov)));
  const qs = (o: Record<string, string>) => "?" + new URLSearchParams(Object.entries({ type, gov, ...o }).filter(([, v]) => v)).toString();

  const Form = ({ a }: { a?: any }) => (
    <form action={saveAffiliation} className="stack" style={{ marginTop: 8 }}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid2">
        <div className="field"><label>Name</label><input name="name" type="text" defaultValue={a?.name ?? ""} required /></div>
        <div className="field"><label>Type</label><select name="type" defaultValue={a?.type ?? "party"}><option value="party">Registered party (provincial)</option><option value="elector_organization">Elector organization (local)</option></select></div>
        <div className="field"><label>Official source <span className="hint">registration, ballot or candidate list</span></label><input name="source_url" type="url" defaultValue={a?.source_url ?? ""} required /></div>
        <div className="field"><label>Website</label><input name="website" type="url" defaultValue={a?.website ?? ""} /></div>
        <div className="field"><label>Platform URL</label><input name="platform_url" type="url" defaultValue={a?.platform_url ?? ""} /></div>
        <div className="field"><label>Platform note</label><input name="platform_note" type="text" defaultValue={a?.platform_note ?? ""} /></div>
        <div className="field"><label>Description <span className="hint">1–2 neutral sentences from its own site</span></label><textarea name="blurb" defaultValue={a?.blurb ?? ""} /></div>
        <div className="field"><label>Description source URL</label><input name="blurb_source" type="url" defaultValue={a?.blurb_source ?? ""} /></div>
      </div>
      <div><button className="btn small">{a ? "Save" : "Add affiliation"}</button></div>
    </form>
  );

  return (
    <div>
      <h1>Affiliations</h1>
      {sp.saved && <p className="notice info">Saved.</p>}
      {sp.err && <p className="notice">An affiliation needs an official source.</p>}
      <div className="filters">
        <div className="seg" role="group" aria-label="Type">
          {[["", "All types"], ["party", "Parties"], ["elector_organization", "Elector organizations"]].map(([v, l]) => (
            <Link key={v} href={qs({ type: v })} className={type === v ? "on" : ""} aria-current={type === v ? "true" : undefined}>{l}</Link>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Government">
          <Link href={qs({ gov: "" })} className={!gov ? "on" : ""}>All governments</Link>
          {govs.map((g) => <Link key={g.id} href={qs({ gov: g.id })} className={gov === g.id ? "on" : ""}>{g.name.replace("School District", "SD").replace(/ \(.*\)/, "")}</Link>)}
        </div>
      </div>
      <p className="small muted">{shown.length} of {rows.length} affiliations</p>
      <table className="adm">
        <thead><tr><th>Name</th><th>Type</th><th>Linked races</th><th>Candidates</th><th></th></tr></thead>
        <tbody>
          {shown.map((a) => (
            <tr key={a.id}>
              <td><b>{a.name}</b>{a.platform_url ? <div className="xs"><a href={a.platform_url} target="_blank" rel="noreferrer">Platform</a></div> : <div className="xs muted">No platform yet</div>}</td>
              <td>{TYPE_LABEL[a.type] ?? a.type}</td>
              <td className="small">{a.links.length ? a.links.map((l: any) => `${l.gov}: ${l.race}${l.gov_id === "province-of-bc" && l.area ? ` (${l.area})` : ""}`).join(" · ") : <span className="muted">None</span>}</td>
              <td>{a.n}</td>
              <td><details><summary className="small" style={{ cursor: "pointer", color: "var(--action)", fontWeight: 700 }}>Edit</summary><Form a={a} /></details></td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="card" style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--action)" }}>Add an affiliation</summary>
        <Form />
      </details>
    </div>
  );
}
