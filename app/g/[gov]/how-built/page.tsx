import Link from "next/link";
import NextBar from "@/components/NextBar";
import { notFound } from "next/navigation";
import { getGov, getIssues, host } from "@/lib/data";
import GovTabs from "@/components/GovTabs";
import { getVoter } from "@/lib/voter";
import { communityFor, THRESHOLD } from "@/lib/community";

export const dynamic = "force-dynamic";
export default async function HowBuilt({ params }: { params: Promise<{ gov: string }> }) {
  const { gov: govId } = await params;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const issues = await getIssues(govId);
  const sources = [...new Set(issues.flatMap((i) => i.sources ?? []))];
  const v = await getVoter();
  const c = await communityFor(govId, issues.map((i) => i.id), v?.riding);
  const viaShare = c.refs.filter((r) => r.source !== "direct").reduce((x, r) => x + r.n, 0);
  const topShare = c.refs.find((r) => r.source !== "direct");
  return (
    <div className="wrap">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your elections</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="how" />
      <p className="page-intro">Where this election&apos;s issue list came from, and how candidate positions were found and checked.</p>
      <div className="card">
        <h2>How this list was built</h2>
        <p>{gov.how_built}</p>
        <p className="small muted">Issues are named as problems, not solutions, and only include what this government can act on. In this alpha the list is a starting point drawn from public sources; once enough people in your community rank it, rankings from signed-in voters will shape it, with a breakdown of where contributions came from.</p>
      </div>
      <div className="card">
        <h2>Who contributed to the community list</h2>
        {c.signed.n < THRESHOLD ? (
          <p className="small muted">Contributions are shown once {THRESHOLD} signed-in voters have ranked ({c.signed.n} so far).</p>
        ) : (
          <table className="adm small" style={{ maxWidth: 520 }}>
            <tbody>
              <tr><td>Signed-in voters (counted)</td><td><b>{c.signed.n}</b></td></tr>
              <tr><td>Visitors without an account (not counted)</td><td>{c.anon.n}</td></tr>
              <tr><td>Arrived directly</td><td>{c.signed.n - viaShare}</td></tr>
              <tr><td>Arrived through someone&apos;s share link</td><td>{viaShare}</td></tr>
              <tr><td>Largest single share link</td><td>{topShare ? `${topShare.pct}% of counted rankings` : "None"}</td></tr>
            </tbody>
          </table>
        )}
        <p className="xs muted" style={{ marginTop: 8 }}>{c.scopeLabel}. If one share link accounts for more than 10% of counted rankings, it&apos;s reviewed for fairness.</p>
      </div>
      <div className="card">
        <h2>Sources ({sources.length})</h2>
        <ul className="small">{sources.map((s) => <li key={s}><a href={s} target="_blank" rel="noreferrer">{host(s)}</a> <span className="xs muted">{s.length > 80 ? s.slice(0, 80) + "…" : s}</span></li>)}</ul>
      </div>
      <NextBar
        status={<><b>Seen enough of how it&apos;s made?</b><span className="muted">Head back to your issues or candidates.</span></>}
        links={[{ href: `/g/${govId}`, label: "Your issues" }]}
        primary={{ href: `/g/${govId}/candidates`, label: "See candidates →" }} />
    </div>
  );
}
