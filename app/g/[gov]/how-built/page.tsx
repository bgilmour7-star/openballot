import Link from "next/link";
import { notFound } from "next/navigation";
import { getGov, getIssues, host } from "@/lib/data";
import GovTabs from "@/components/GovTabs";

export const dynamic = "force-dynamic";
export default async function HowBuilt({ params }: { params: Promise<{ gov: string }> }) {
  const { gov: govId } = await params;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const issues = await getIssues(govId);
  const sources = [...new Set(issues.flatMap((i) => i.sources ?? []))];
  return (
    <div className="wrap">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your votes</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="how" />
      <div className="card">
        <h2>How this list was built</h2>
        <p>{gov.how_built}</p>
        <p className="small muted">Issues are named as problems, not solutions, and only include what this government can act on. In this alpha the list is a starting point drawn from public sources; once enough people in your community rank it, rankings from signed-in voters will shape it, with a breakdown of where contributions came from.</p>
      </div>
      <div className="card">
        <h2>Sources ({sources.length})</h2>
        <ul className="small">{sources.map((s) => <li key={s}><a href={s} target="_blank" rel="noreferrer">{host(s)}</a> <span className="xs muted">{s.length > 80 ? s.slice(0, 80) + "…" : s}</span></li>)}</ul>
      </div>
    </div>
  );
}
