"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { q, one } from "@/lib/db";
import { ensureVoter, getVoter, logEvent, VOTER_COOKIE } from "@/lib/voter";
import { lookupAddress, lookupPostal, normalizePostal } from "@/lib/location";
import { currentUser } from "@/lib/auth/server";

const clip = (v: FormDataEntryValue | null, n = 2000) => String(v ?? "").trim().slice(0, n);

export async function locate(formData: FormData) {
  const code = normalizePostal(clip(formData.get("postal"), 10));
  const ref = clip(formData.get("ref"), 40) || null;
  if (!code) redirect("/?err=postal");
  const v = await ensureVoter(ref);
  let loc;
  try { loc = await lookupPostal(code!); } catch (e: any) {
    console.error(`[locate] postal lookup failed for ${code}:`, e?.message ?? e);
    await logEvent(v.id, "lookup_failed", { postal: code, status: e?.status ?? null });
    // A code the boundary service doesn't know (often a brand-new one) can still be placed by street address.
    if (e?.status === 404) {
      await q(`update voters set postal_code=$2 where id=$1`, [v.id, code]);
      redirect(`/where?reason=unknown`);
    }
    redirect(`/?err=lookup&postal=${code}`);
  }
  await q(`update voters set postal_code=$2, city=$3, riding=$4, located_by='postal' where id=$1`, [v.id, code, loc!.city, loc!.riding]);
  await logEvent(v.id, "lookup", { postal: code!.slice(0, 3), city: loc!.city, riding: loc!.riding, ambiguous: loc!.ambiguous });
  if (loc!.ambiguous || (!loc!.city && !loc!.riding)) redirect(`/where?reason=${loc!.ambiguous ? "boundary" : "outside"}`);
  redirect("/votes");
}

export async function locateAddress(formData: FormData) {
  const address = clip(formData.get("address"), 200);
  if (address.length < 5) redirect("/where?err=address");
  const v = await ensureVoter();
  let loc;
  try { loc = await lookupAddress(/bc\b|british columbia/i.test(address) ? address : `${address}, BC`); } catch { redirect("/where?err=lookup"); }
  if (!loc) redirect("/where?err=nomatch");
  // The street address is used for this lookup only and is never stored.
  await q(`update voters set city=$2, riding=$3, located_by='address' where id=$1`, [v.id, loc!.city, loc!.riding]);
  await logEvent(v.id, "lookup_address", { city: loc!.city, riding: loc!.riding });
  redirect("/votes");
}

export async function saveRanking(govId: string, issueIds: string[]) {
  const v = await ensureVoter();
  const ids = issueIds.filter((s) => typeof s === "string" && s.startsWith(govId + "--")).slice(0, 20);
  if (!ids.length) return { ok: false };
  const existed = await one(`select 1 from rankings where voter_id=$1 and government_id=$2`, [v.id, govId]);
  await q(`insert into rankings (voter_id, government_id, issue_ids) values ($1,$2,$3)
           on conflict (voter_id, government_id) do update set issue_ids=excluded.issue_ids, updated_at=now()`, [v.id, govId, JSON.stringify(ids)]);
  await logEvent(v.id, existed ? "ranking_updated" : "ranking_saved", { gov: govId });
  return { ok: true };
}

export async function saveView(issueId: string, value: number | null) {
  const v = await ensureVoter();
  if (typeof issueId !== "string" || issueId.length > 120) return { ok: false };
  if (value === null) {
    await q(`delete from views where voter_id=$1 and issue_id=$2`, [v.id, issueId]);
    return { ok: true };
  }
  const val = Math.max(-2, Math.min(2, Math.round(value)));
  const existed = await one(`select 1 from views where voter_id=$1 and issue_id=$2`, [v.id, issueId]);
  await q(`insert into views (voter_id, issue_id, value) values ($1,$2,$3)
           on conflict (voter_id, issue_id) do update set value=excluded.value, updated_at=now()`, [v.id, issueId, val]);
  if (!existed) await logEvent(v.id, "view_shared", { issue: issueId });
  return { ok: true };
}

export async function submitFeedback(formData: FormData) {
  const message = clip(formData.get("message"));
  const page = clip(formData.get("page"), 200);
  const email = clip(formData.get("email"), 200) || null;
  if (message.length < 2) return;
  const v = await ensureVoter();
  await q(`insert into feedback (voter_id, page, message, email) values ($1,$2,$3,$4)`, [v.id, page, message, email]);
  await logEvent(v.id, "feedback", { page });
  redirect(`${page || "/"}${page.includes("?") ? "&" : "?"}thanks=1`);
}

export async function submitClaim(formData: FormData) {
  const candidacyId = clip(formData.get("candidacy_id"), 200);
  const name = clip(formData.get("name"), 200);
  const email = clip(formData.get("email"), 200);
  const proof = clip(formData.get("proof_url"), 500);
  const message = clip(formData.get("message"), 5000);
  if (!name || !email.includes("@")) redirect(`/c/${encodeURIComponent(candidacyId)}/claim?err=1`);
  const v = await ensureVoter();
  await q(`insert into claim_requests (candidacy_id, name, email, proof_url, message) values ($1,$2,$3,$4,$5)`,
    [candidacyId, name, email, proof, message]);
  await logEvent(v.id, "claim_request", { candidacy: candidacyId });
  redirect(`/c/${encodeURIComponent(candidacyId)}?claimed=1`);
}

export async function logShare(kind: string) {
  const v = await ensureVoter();
  await logEvent(v.id, "share", { kind: String(kind).slice(0, 30) });
}

/** After sign-in: attach this browser's voter record to the account (or adopt the account's existing one). */
export async function linkAccount() {
  const user = await currentUser();
  if (!user) return { ok: false };
  const current = await getVoter();
  const owned = await one<{ id: string }>(`select id from voters where auth_user_id=$1`, [user.id]);
  const jar = await cookies();
  if (owned && current && owned.id !== current.id) {
    // Bring over anything done anonymously that the account doesn't have yet.
    await q(`insert into rankings (voter_id, government_id, issue_ids, updated_at)
             select $1, government_id, issue_ids, updated_at from rankings where voter_id=$2
             on conflict (voter_id, government_id) do update set issue_ids=excluded.issue_ids, updated_at=excluded.updated_at
             where rankings.updated_at < excluded.updated_at`, [owned.id, current.id]);
    await q(`insert into views (voter_id, issue_id, value, updated_at) select $1, issue_id, value, updated_at from views where voter_id=$2
             on conflict (voter_id, issue_id) do update set value=excluded.value, updated_at=excluded.updated_at
             where views.updated_at < excluded.updated_at`, [owned.id, current.id]);
    await q(`update voters o set postal_code=coalesce(c.postal_code,o.postal_code), city=coalesce(c.city,o.city), riding=coalesce(c.riding,o.riding)
             from voters c where o.id=$1 and c.id=$2 and c.postal_code is not null`, [owned.id, current.id]);
    jar.set(VOTER_COOKIE, owned.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 400 });
    await logEvent(owned.id, "signin", {});
    return { ok: true };
  }
  if (owned) {
    jar.set(VOTER_COOKIE, owned.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 400 });
    await logEvent(owned.id, "signin", {});
    return { ok: true };
  }
  const v = current ?? (await ensureVoter());
  await q(`update voters set auth_user_id=$2, email=$3 where id=$1`, [v.id, user.id, user.email]);
  await logEvent(v.id, "signup", {});
  return { ok: true };
}

export async function forgetLocation() {
  const v = await getVoter();
  if (v) await q(`update voters set postal_code=null, city=null, riding=null, located_by=null where id=$1`, [v.id]);
  redirect("/");
}
