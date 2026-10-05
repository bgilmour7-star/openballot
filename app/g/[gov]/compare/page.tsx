import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { one } from "@/lib/db";
import { candidatesForRaces, fitFor, getGov, getIssues, positionsFor, rankingFor, shuffleFor, stanceOn, viewWords, viewsFor, type Race, type Stance } from "@/lib/data";
import { alignment, firstDifferences, fullOrder } from "@/lib/alignment";
import GovTabs from "@/components/GovTabs";
import NextBar from "@/components/NextBar";

export const dynamic = "force-dynamic";

const GROUP_LABEL: Record<string, string> = {
  strong: "speak to most of your top issues", some: "speak to one of your top issues", unknown: "have nothing on record for your top issues",
};
const short = (st: Stance) =>
  st.kind === "similar" ? "Similar" : st.kind === "different" ? "Different" : st.kind === "their-side" ? `Leans ${st.side}` : st.kind === "no-side" ? "No clear side" : "Nothing on record";

export default async function ComparePage({ params, searchParams }: { params: Promise<{ gov: string }>; searchParams: Promise<Record<string, string>> }) {
  const { gov: govId } = await params;
  const sp = await searchParams;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const v = await getVoter();
  const race = sp.race ? await one<Race>(`select r.* from races r join elections e on e.id=r.election_id where r.id=$1 and e.government_id=$2`, [sp.race, govId]) : null;
  const [issues, ranking, views] = await Promise.all([getIssues(govId), rankingFor(v?.id, govId), viewsFor(v?.id)]);
  if (!race || !ranking) redirect(`/g/${govId}/candidates`);
  const cands = await candidatesForRaces([race.id]);
  const positions = await positionsFor(cands.map((c) => c.id));
  const top = ranking.slice(0, 3);
  const order = fullOrder(ranking, issues.map((i) => i.id));
  const byId = Object.fromEntries(issues.map((i) => [i.id, i]));
  const group = ["strong", "some", "unknown"].includes(sp.group) ? sp.group : "strong";
  // Same random order as the Candidates tab, so nobody moves when you compare.
  const cols = shuffleFor(cands, (v?.id ?? "anon") + race.id)
    .map((c) => { const pos = positions.filter((p) => p.candidacy_id === c.id); return { c, pos, fit: fitFor(pos, top, views), align: alignment(pos, order, views) }; })
    .filter((x) => x.fit.group === group);
  if (cols.length < 2) redirect(`/g/${govId}/candidates?race=${race.id}`);
  const { differ, partial } = firstDifferences(cols.map((x) => ({ id: x.c.id, positions: x.pos })), order);
  const rank = (iid: string) => order.indexOf(iid) + 1;
  const anyScore = cols.some((x) => x.align.score != null);

  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href={`/g/${govId}/candidates?race=${race.id}`}>← {race.office} candidates</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="candidates" />
      <p className="page-intro">These {cols.length} candidates are tied: they all {GROUP_LABEL[group]}. Here they are side by side across your whole list, in your order, so the smaller issues can help you choose. Order is random and never a recommendation.</p>

      <div className="cmp-summary card">
        {differ ? (
          <p style={{ margin: 0 }}><b>They first take different sides on your #{rank(differ)}: {byId[differ].title}.</b> <span className="muted">That row is highlighted below.</span></p>
        ) : (
          <p style={{ margin: 0 }}><b>None of them take different sides on any of your issues yet.</b> <span className="muted">Most candidates haven&apos;t said where they stand on every issue.</span></p>
        )}
        {partial && partial !== differ && <p className="small muted" style={{ margin: "6px 0 0" }}>The first issue where only some of them have said anything is your #{rank(partial)}: {byId[partial].title}.</p>}
      </div>

      <div className="cmp-scroll" role="region" aria-label="Comparison table" tabIndex={0}>
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col" className="cmp-issue-h">Your list</th>
              {cols.map(({ c }) => <th key={c.id} scope="col"><Link href={`/c/${encodeURIComponent(c.id)}`}>{c.name}</Link>{c.affiliation_name ? <span className="xs muted" style={{ display: "block", fontWeight: 400 }}>{c.affiliation_name}</span> : null}</th>)}
            </tr>
          </thead>
          <tbody>
            {order.map((iid, k) => {
              const i = byId[iid];
              const mark = iid === differ ? "cmp-differ" : iid === partial ? "cmp-partial" : "";
              return (
                <tr key={iid} className={`${mark} ${k < 3 ? "cmp-top" : ""}`}>
                  <th scope="row" className="cmp-issue">
                    <div className="cmp-ic">
                      <span className="cmp-rank">{k + 1}</span>
                      <span><b>{i.title}</b>{iid === differ && <span className="cmp-tag">First difference</span>}
                        <span className="xs muted" style={{ display: "block" }}>{viewWords(i, views[iid]) ? `You: ${viewWords(i, views[iid])}` : "You: no view yet"}</span></span>
                    </div>
                  </th>
                  {cols.map(({ c, pos }) => { const st = stanceOn(pos, iid, views[iid]); return (
                    <td key={c.id} className={`stance st-${st.kind}`}><span className="st-dot" aria-hidden /><span>{short(st)}{st.inherited ? <span className="xs muted"> (party)</span> : null}</span></td>
                  ); })}
                </tr>
              );
            })}
            {anyScore && (
              <tr className="cmp-score">
                <th scope="row" className="cmp-issue"><b>Alignment across your list</b></th>
                {cols.map(({ c, align }) => <td key={c.id}>{align.score != null ? <b>{align.score}%</b> : <span className="xs muted">Not enough on record</span>}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="xs muted" style={{ marginTop: 8 }}>Sides are Openballot&apos;s reading of each candidate&apos;s statements, checked by a person. &quot;Nothing on record&quot; means we haven&apos;t found a statement yet. A single alignment number appears only once a candidate has a side on at least 5 of your issues.</p>

      <NextBar
        status={<><b>Comparing {cols.length} tied candidates</b><span className="muted">{race.office}{race.seats > 1 ? ` · vote for up to ${race.seats}` : ""}</span></>}
        links={[{ href: `/g/${govId}`, label: "Change ranking" }]}
        primary={{ href: `/g/${govId}/candidates?race=${race.id}`, label: "Back to all candidates" }} />
    </div>
  );
}
