import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { getGov, getIssues, rankingFor, viewsFor } from "@/lib/data";
import GovTabs from "@/components/GovTabs";
import RankIssues from "@/components/RankIssues";
import { communityFor, THRESHOLD } from "@/lib/community";
import { currentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function IssuesPage({ params, searchParams }: { params: Promise<{ gov: string }>; searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { gov: govId } = await params;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const v = await getVoter();
  const [issues, ranking, views] = await Promise.all([getIssues(govId), rankingFor(v?.id, govId), viewsFor(v?.id)]);
  const order = ranking ? [...ranking.filter((id) => issues.some((i) => i.id === id)), ...issues.filter((i) => !ranking.includes(i.id)).map((i) => i.id)] : issues.map((i) => i.id);
  const user = await currentUser();
  const comm = ranking ? await communityFor(govId, issues.map((i) => i.id), v?.riding) : null;
  const community = comm && comm.signed.n >= THRESHOLD ? Object.fromEntries(comm.signed.issues.map((s) => [s.id, s.rank])) : undefined;
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
      {sp.counted && user && <p className="counted-note">✓ Your ranking now counts in {gov.name}&apos;s community list.</p>}
      <RankIssues govId={govId} issues={issues} initialOrder={order} initialViews={views} saved={!!ranking} flip={flip} community={community} signedIn={!!user} govName={gov.name} />
    </div>
  );
}
