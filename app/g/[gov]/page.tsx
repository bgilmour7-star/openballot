import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { getGov, getIssues, racesFor, rankingFor, viewsFor, type Race } from "@/lib/data";
import { q } from "@/lib/db";
import { flipFor } from "@/lib/flip";
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
  // How many candidates on this voter's ballot have said something about each issue (own or party positions).
  let races: Race[] = v ? await racesFor(v, govId) : [];
  if (!races.length) races = await q<Race>(`select r.* from races r join elections e on e.id=r.election_id where e.government_id=$1`, [govId]);
  const spk = await q<{ issue_id: string; n: number }>(`select issue_id, count(distinct cid)::int n from (
      select p.issue_id, c.id cid from candidacies c join positions p on p.candidacy_id=c.id where c.race_id = any($1) and c.status <> 'withdrawn'
      union all
      select ap.issue_id, c.id from candidacies c join affiliation_positions ap on ap.affiliation_id=c.affiliation_id where c.race_id = any($1) and c.status <> 'withdrawn'
    ) x where issue_id is not null group by 1`, [races.map((r) => r.id)]);
  const speakers = Object.fromEntries(spk.map((r) => [r.issue_id, r.n]));
  const seed = v?.id ?? "anon";
  const flip = Object.fromEntries(issues.map((i) => [i.id, flipFor(seed, i.id)]));
  return (
    <div className="wrap">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your elections</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="issues" />
      <p className="page-intro">Start here. Put the issues for this election in the order that matters to you. Your top 3 decide how candidates are grouped on the next tab.</p>
      {sp.counted && user && <p className="counted-note">✓ Your ranking now counts in {gov.name}&apos;s community issue ranking.</p>}
      <RankIssues govId={govId} issues={issues} initialOrder={order} initialViews={views} saved={!!ranking} flip={flip} community={community} signedIn={!!user} govName={gov.name} speakers={speakers} />
    </div>
  );
}
