import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { getGov, getIssues, rankingFor, viewsFor } from "@/lib/data";
import GovTabs from "@/components/GovTabs";
import RankIssues from "@/components/RankIssues";

export const dynamic = "force-dynamic";

export default async function IssuesPage({ params }: { params: Promise<{ gov: string }> }) {
  const { gov: govId } = await params;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const v = await getVoter();
  const [issues, ranking, views] = await Promise.all([getIssues(govId), rankingFor(v?.id, govId), viewsFor(v?.id)]);
  const order = ranking ? [...ranking.filter((id) => issues.some((i) => i.id === id)), ...issues.filter((i) => !ranking.includes(i.id)).map((i) => i.id)] : issues.map((i) => i.id);
  const seed = v?.id ?? "anon";
  const flip = Object.fromEntries(issues.map((i) => {
    let h = 0; for (const ch of seed + i.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return [i.id, h % 2 === 1];
  }));
  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your votes</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="issues" />
      <RankIssues govId={govId} issues={issues} initialOrder={order} initialViews={views} saved={!!ranking} flip={flip} />
    </div>
  );
}
