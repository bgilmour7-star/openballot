import { createNeonAuth } from "@neondatabase/auth/next/server";
import { createHash } from "node:crypto";

// Cookie-signing secret: use NEON_AUTH_COOKIE_SECRET if set; otherwise derive one from the
// database password Vercel already holds, so no extra secret needs to be pasted anywhere.
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ||
  createHash("sha256").update(`openballot-cookie:${process.env.PGPASSWORD ?? process.env.DATABASE_URL ?? "dev"}`).digest("hex");

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: cookieSecret },
});

export async function currentUser(): Promise<{ id: string; email: string; name?: string } | null> {
  if (!process.env.NEON_AUTH_BASE_URL) return null;
  try {
    const { data } = await auth.getSession();
    const u = (data as any)?.user;
    return u?.id ? { id: u.id, email: u.email, name: u.name } : null;
  } catch {
    return null;
  }
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "bgilmour7+OBadmin@gmail.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
export async function currentAdmin() {
  const u = await currentUser();
  if (!u?.email) return null;
  return adminEmails().includes(u.email.toLowerCase()) ? u : null;
}
