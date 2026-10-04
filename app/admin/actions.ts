"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/auth/server";
import { one, q } from "@/lib/db";

async function requireAdmin() {
  const a = await currentAdmin();
  if (!a) redirect("/signin");
  return a!;
}
const s = (f: FormData, k: string, n = 5000) => { const v = String(f.get(k) ?? "").trim().slice(0, n); return v === "" ? null : v; };
const b = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
async function audit(actor: string, entity: string, id: string, action: string, before: unknown, after: unknown) {
  await q(`insert into audit_log (actor, entity, entity_id, action, before, after) values ($1,$2,$3,$4,$5,$6)`,
    [actor, entity, id, action, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}
const jsonList = (v: string | null) => (v ? v.split(/\n+/).map((x) => x.trim()).filter(Boolean) : []);

export async function saveCandidate(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 300)!;
  const before = await one(`select * from candidacies where id=$1`, [id]);
  const links = jsonList(s(f, "links")).map((line) => { const [label, url] = line.includes("|") ? line.split("|").map((x) => x.trim()) : ["", line]; return { label, url }; });
  const after = {
    name: s(f, "name", 200), ballot_name: s(f, "ballot_name", 200), incumbent: f.get("incumbent") === "yes" ? true : f.get("incumbent") === "no" ? false : null,
    affiliation_id: s(f, "affiliation_id", 200), affiliation_source: s(f, "affiliation_source", 500), declared_independent: b(f, "declared_independent"),
    website: s(f, "website", 500), links, sources: jsonList(s(f, "sources")), status: s(f, "status", 30) ?? "active",
    summary: s(f, "summary", 400), summary_source: s(f, "summary_source", 500),
  };
  if (after.affiliation_id && !after.affiliation_source) redirect(`/admin/candidates/${encodeURIComponent(id)}?err=affsource`);
  await q(`update candidacies set name=$2, ballot_name=$3, incumbent=$4, affiliation_id=$5, affiliation_source=$6, declared_independent=$7,
           website=$8, links=$9, sources=$10, status=$11, summary=$12, summary_source=$13, updated_at=now() where id=$1`,
    [id, after.name, after.ballot_name, after.incumbent, after.affiliation_id, after.affiliation_source, after.declared_independent,
     after.website, JSON.stringify(after.links), JSON.stringify(after.sources), after.status, after.summary, after.summary_source]);
  await audit(a.email, "candidacy", id, "update", before, after);
  revalidatePath("/", "layout");
  redirect(`/admin/candidates/${encodeURIComponent(id)}?saved=1`);
}

export async function addCandidate(f: FormData) {
  const a = await requireAdmin();
  const race = s(f, "race_id", 200)!, name = s(f, "name", 200)!;
  const id = `${race}--${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  await q(`insert into candidacies (id, race_id, name, sources) values ($1,$2,$3,$4) on conflict (id) do nothing`, [id, race, name, JSON.stringify(jsonList(s(f, "sources")))]);
  await audit(a.email, "candidacy", id, "create", null, { race, name });
  redirect(`/admin/candidates/${encodeURIComponent(id)}`);
}

export async function savePosition(f: FormData) {
  const a = await requireAdmin();
  const cand = s(f, "candidacy_id", 300)!;
  const pid = s(f, "id", 20);
  const lean = s(f, "lean", 3);
  const vals = [s(f, "issue_id", 200), s(f, "topic", 100), s(f, "summary", 600), s(f, "source_url", 500), s(f, "source_type", 40) ?? "candidate", lean === null ? null : Number(lean)];
  if (!vals[2]) redirect(`/admin/candidates/${encodeURIComponent(cand)}?err=summary`);
  if (pid) {
    const before = await one(`select * from positions where id=$1`, [pid]);
    await q(`update positions set issue_id=$2, topic=$3, summary=$4, source_url=$5, source_type=$6, lean=$7, lean_state=case when $7::int is not null then 'approved' else lean_state end, lean_reviewed_by=case when $7::int is not null then $8 else lean_reviewed_by end, updated_at=now() where id=$1`, [pid, ...vals, a.email]);
    await audit(a.email, "position", pid, "update", before, vals);
  } else {
    const r = await one<{ id: number }>(`insert into positions (candidacy_id, issue_id, topic, summary, source_url, source_type, lean, lean_state) values ($1,$2,$3,$4,$5,$6,$7, case when $7::int is not null then 'approved' end) returning id`, [cand, ...vals]);
    await audit(a.email, "position", String(r!.id), "create", null, vals);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/candidates/${encodeURIComponent(cand)}?saved=1#positions`);
}

export async function deletePosition(f: FormData) {
  const a = await requireAdmin();
  const pid = s(f, "id", 20)!, cand = s(f, "candidacy_id", 300)!;
  const before = await one(`select * from positions where id=$1`, [pid]);
  await q(`delete from positions where id=$1`, [pid]);
  await audit(a.email, "position", pid, "delete", before, null);
  redirect(`/admin/candidates/${encodeURIComponent(cand)}?saved=1#positions`);
}

export async function saveIssue(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 200)!;
  const before = await one(`select * from issues where id=$1`, [id]);
  const after = [s(f, "title", 120), s(f, "description", 600), s(f, "what_it_affects", 400), s(f, "who_decides", 400), s(f, "question", 300),
    s(f, "pole_a", 300), s(f, "pole_b", 300), JSON.stringify(jsonList(s(f, "sources"))), Number(s(f, "sort", 4) ?? 0), b(f, "active")];
  await q(`update issues set title=$2, description=$3, what_it_affects=$4, who_decides=$5, question=$6, pole_a=$7, pole_b=$8, sources=$9, sort=$10, active=$11 where id=$1`, [id, ...after]);
  await audit(a.email, "issue", id, "update", before, after);
  redirect(`/admin/issues/${encodeURIComponent(id)}?saved=1`);
}

export async function saveHowBuilt(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 100)!;
  const before = await one(`select how_built from governments where id=$1`, [id]);
  await q(`update governments set how_built=$2 where id=$1`, [id, s(f, "how_built", 4000)]);
  await audit(a.email, "government", id, "update", before, { how_built: s(f, "how_built", 4000) });
  redirect(`/admin/issues?gov=${id}&saved=1`);
}

export async function saveElection(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 100)!;
  const before = await one(`select * from elections where id=$1`, [id]);
  let adv: unknown = [];
  try { adv = JSON.parse(s(f, "advance_voting", 4000) ?? "[]"); } catch { redirect(`/admin/elections/${id}?err=json`); }
  const after = [s(f, "voting_day", 10), s(f, "voting_hours", 200), JSON.stringify(adv), s(f, "how_to_vote", 3000), s(f, "mail_ballot", 2000), s(f, "official_url", 500)];
  await q(`update elections set voting_day=$2, voting_hours=$3, advance_voting=$4, how_to_vote=$5, mail_ballot=$6, official_url=$7 where id=$1`, [id, ...after]);
  await audit(a.email, "election", id, "update", before, after);
  redirect(`/admin/elections/${id}?saved=1`);
}

export async function saveAffiliation(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 100) ?? (s(f, "name", 200) ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const before = await one(`select * from affiliations where id=$1`, [id]);
  const vals = [s(f, "type", 40) ?? "party", s(f, "name", 200), s(f, "website", 500), s(f, "source_url", 500), s(f, "platform_url", 500), s(f, "platform_note", 1000), s(f, "blurb", 600), s(f, "blurb_source", 500)];
  if (!vals[3]) redirect(`/admin/affiliations?err=source`);
  await q(`insert into affiliations (id,type,name,website,source_url,platform_url,platform_note,blurb,blurb_source) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (id) do update set type=$2, name=$3, website=$4, source_url=$5, platform_url=$6, platform_note=$7, blurb=$8, blurb_source=$9`, [id, ...vals]);
  await audit(a.email, "affiliation", id, before ? "update" : "create", before, vals);
  redirect(`/admin/affiliations?saved=1`);
}

export async function setRequestStatus(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 20)!;
  const before = await one(`select status, admin_note from claim_requests where id=$1`, [id]);
  await q(`update claim_requests set status=$2, admin_note=$3 where id=$1`, [id, s(f, "status", 20), s(f, "admin_note", 2000)]);
  await audit(a.email, "claim_request", id, "update", before, { status: s(f, "status", 20) });
  redirect(`/admin/requests?saved=1`);
}

export async function setExclude(f: FormData) {
  const a = await requireAdmin();
  const email = (s(f, "email", 200) ?? "").toLowerCase();
  const exclude = f.get("exclude") === "true";
  await q(`update voters set exclude_from_results=$2 where lower(email)=$1`, [email, exclude]);
  await audit(a.email, "voter", email, exclude ? "exclude" : "include", null, { exclude });
  redirect(`/admin/community?saved=1`);
}

export async function reviewLean(f: FormData) {
  const a = await requireAdmin();
  const id = s(f, "id", 20)!;
  const side = s(f, "side", 6);
  const act = s(f, "do", 10);
  const back = s(f, "back", 300) ?? "";
  const before = await one(`select lean, lean_state, proposed_lean from positions where id=$1`, [id]);
  if (act === "hide") {
    await q(`update positions set lean=null, lean_state='rejected', lean_reviewed_by=$2, lean_reviewed_at=now() where id=$1`, [id, a.email]);
  } else {
    const lean = side == null || side === "none" ? null : Math.max(-2, Math.min(2, Number(side)));
    await q(`update positions set lean=$2, lean_state='approved', lean_reviewed_by=$3, lean_reviewed_at=now() where id=$1`, [id, lean, a.email]);
  }
  await audit(a.email, "position_side", id, act === "hide" ? "hide" : "approve", before, { side });
  revalidatePath("/", "layout");
  const keep = back.startsWith("?") ? back.replace(/[&?]saved=1/, "") : "?";
  redirect(`/admin/leans${keep}${keep.length > 1 ? "&" : ""}saved=1`);
}

export async function approveAllNoSide() {
  const a = await requireAdmin();
  const rows = await q<{ id: number }>(`update positions set lean=null, lean_state='approved', lean_reviewed_by=$1, lean_reviewed_at=now()
    where lean_state='proposed' and proposed_lean is null returning id`, [a.email]);
  await audit(a.email, "position_side", "bulk", "approve_no_side", null, { count: rows.length });
  revalidatePath("/", "layout");
  redirect(`/admin/leans?saved=1`);
}
