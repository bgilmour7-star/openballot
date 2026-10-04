import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, currentAdmin } from "@/lib/auth/server";
import { getVoter } from "@/lib/voter";
import { q } from "@/lib/db";
import SignOut from "@/components/SignOut";

export const dynamic = "force-dynamic";
export default async function Account() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const v = await getVoter();
  const admin = await currentAdmin();
  const rankings = v ? await q<{ name: string }>(`select g.name from rankings r join governments g on g.id=r.government_id where r.voter_id=$1`, [v.id]) : [];
  return (
    <div className="wrap">
      <h1>Your account</h1>
      <p className="page-intro">Your sign-in details and the rankings you&apos;ve saved. Your rankings count toward each area&apos;s community issue ranking, but your name and email are never shown.</p>
      <div className="card">
        <p>Signed in as <b>{user.email}</b></p>
        <p className="small muted">Rankings saved: {rankings.length ? rankings.map((r) => r.name).join(", ") : "none yet"}.</p>
        <div className="row"><Link className="btn" href="/votes">Your elections</Link>{admin && <Link className="btn secondary" href="/admin">Admin</Link>}<SignOut /></div>
      </div>
      <p className="small muted">Want your data deleted? Use <b>Send feedback</b> below with the words &quot;delete my data&quot; and the email above, and it will be removed within 7 days.</p>
    </div>
  );
}
