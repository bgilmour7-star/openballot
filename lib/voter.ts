import { cookies } from "next/headers";
import { one, q } from "./db";

export const VOTER_COOKIE = "ob_vid";
export type Voter = {
  id: string; auth_user_id: string | null; email: string | null; postal_code: string | null;
  city: string | null; riding: string | null; located_by: string | null;
};
const isUuid = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);

/** Read-only: safe in pages. */
export async function getVoter(): Promise<Voter | null> {
  const id = (await cookies()).get(VOTER_COOKIE)?.value;
  if (!isUuid(id)) return null;
  return one<Voter>(`select * from voters where id=$1`, [id]);
}

/** In server actions / route handlers only: creates the voter and sets the cookie. */
export async function ensureVoter(referredBy?: string | null): Promise<Voter> {
  const existing = await getVoter();
  if (existing) {
    await q(`update voters set last_seen=now() where id=$1`, [existing.id]);
    return existing;
  }
  const ref = isUuid(referredBy ?? undefined) ? referredBy : null;
  const v = (await one<Voter>(`insert into voters (referred_by) values ($1) returning *`, [ref]))!;
  (await cookies()).set(VOTER_COOKIE, v.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 400 });
  if (ref) await logEvent(v.id, "referral_visit", { ref });
  return v;
}

export async function logEvent(voterId: string | null, name: string, data: Record<string, unknown> = {}) {
  try { await q(`insert into events (voter_id,name,data) values ($1,$2,$3)`, [voterId, name, JSON.stringify(data)]); } catch {}
}

/** Governments a located voter has votes in, in display order. */
export async function governmentsFor(v: Pick<Voter, "city" | "riding">): Promise<string[]> {
  const out: string[] = [];
  if (v.city) {
    const m = await one<{ gov_id: string; school_gov_id: string | null }>(`select gov_id, school_gov_id from municipalities where id=$1`, [v.city]);
    if (m) out.push(m.gov_id, ...(m.school_gov_id ? [m.school_gov_id] : []));
  }
  if (v.riding) out.push("province-of-bc");
  return out;
}
