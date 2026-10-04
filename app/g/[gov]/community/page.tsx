import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoter } from "@/lib/voter";
import { getGov, getIssues, rankingFor } from "@/lib/data";
import { communityFor, THRESHOLD } from "@/lib/community";
import GovTabs from "@/components/GovTabs";
import Share from "@/components/Share";
import Journey from "@/components/Journey";
import { currentUser } from "@/lib/auth/server";
import { viewsFor } from "@/lib/data";

export const dynamic = "force-dynamic";

function ViewsBar({ views, a, b }: { views: number[]; a: string; b: string }) {
  const total = views.reduce((x, y) => x + y, 0);
  if (total < THRESHOLD) return <p className="xs muted" style={{ margin: "6px 0 0" }}>Not enough views shared on this issue yet.</p>;
  const pct = views.map((v) => (v / total) * 100);
  const aSide = Math.round(pct[0] + pct[1]), bSide = Math.round(pct[3] + pct[4]), mid = 100 - aSide - bSide;
  return (
    <div className="vbar-wrap">
      <div className="vbar" role="img" aria-label={`${aSide}% lean toward: ${a}. ${mid}% unsure. ${bSide}% lean toward: ${b}.`}>
        {pct.map((p, k) => <span key={k} className={`vb vb${k}`} style={{ width: `${p}%` }} />)}
      </div>
      <div className="vbar-labels xs"><span><b>{aSide}%</b> {a}</span><span className="muted">{mid}% unsure</span><span style={{ textAlign: "right" }}><b>{bSide}%</b> {b}</span></div>
    </div>
  );
}

export default async function CommunityPage({ params, searchParams }: { params: Promise<{ gov: string }>; searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { gov: govId } = await params;
  const gov = await getGov(govId);
  if (!gov) notFound();
  const v = await getVoter();
  const [issues, mine] = await Promise.all([getIssues(govId), rankingFor(v?.id, govId)]);
  const byId = Object.fromEntries(issues.map((i) => [i.id, i]));
  const c = await communityFor(govId, issues.map((i) => i.id), v?.riding);
  const unlocked = c.signed.n >= THRESHOLD;
  const user = await currentUser();
  const views = await viewsFor(v?.id);
  const viewsDone = (mine ?? []).slice(0, 3).filter((id) => views[id] != null).length;
  const counted = !!user && !!mine;
  const signHref = `/signin?next=${encodeURIComponent(`/g/${govId}/community`)}&gov=${govId}`;
  const myRank = Object.fromEntries((mine ?? []).map((id, k) => [id, k + 1]));

  return (
    <div className="wrap wide">
      <p className="small" style={{ margin: 0 }}><Link href="/votes">← Your elections</Link></p>
      <h1>{gov.name}</h1>
      <GovTabs gov={govId} on="community" />
      <p className="page-intro">How voters in this area rank the issues, combined. It appears once {THRESHOLD} people with free accounts have ranked, and it never changes the order of candidates.</p>
      {sp.counted && counted && <p className="counted-note">✓ Your ranking now counts in {gov.name}&apos;s community list. Thanks for adding it.</p>}
      <div className="cands-layout">
        <div>
          {mine && <Journey govId={govId} govName={gov.name} ranked viewsDone={viewsDone} signedIn={!!user} next={`/g/${govId}/community`} />}
          {!mine ? (
            <div className="card lock">
              <p className="stand-kicker">Community priorities</p>
              <h2>Rank the issues to see what your neighbours think</h2>
              <p className="muted">You&apos;ll see the community list right after you save your own, so your choices are yours first.</p>
              <Link className="btn" href={`/g/${govId}`}>Rank the issues</Link>
              <p className="xs muted" style={{ marginTop: 12 }}>{c.signed.n} signed-in {c.signed.n === 1 ? "voter has" : "voters have"} ranked so far · {c.scopeLabel.toLowerCase()}</p>
            </div>
          ) : !unlocked ? (
            <div className="card lock">
              <p className="stand-kicker">Almost there</p>
              <h2>{c.signed.n} of {THRESHOLD} neighbours have ranked</h2>
              {!user && <p className="small" style={{ margin: "0 0 4px" }}><b>Yours would be number {c.signed.n + 1}.</b> <Link href={signHref}>Add your ranking</Link></p>}
              <div className="progress" aria-hidden><span style={{ width: `${(c.signed.n / THRESHOLD) * 100}%` }} /></div>
              <p className="muted">The community list appears once {THRESHOLD} signed-in voters {c.scope === "riding" ? "in your riding" : "here"} have ranked. Only rankings from signed-in voters count.</p>
              <Share voterId={v?.id} />
            </div>
          ) : (
            <section>
              <div className="race-head">
                <h2 id="c-h">What matters most here</h2>
                <p className="small muted" style={{ margin: 0 }}>{c.scopeLabel} · {c.signed.n} signed-in {c.signed.n === 1 ? "voter" : "voters"}</p>
              </div>
              {!counted && (
                <p className="notyet small">These numbers don&apos;t include your ranking yet. You&apos;re seeing them as a visitor.</p>
              )}
              <ol className="comm-list">
                {c.signed.issues.map((s) => {
                  const i = byId[s.id];
                  return (
                    <li key={s.id} className="comm-item">
                      <div className="comm-top">
                        <span className="comm-rank">{s.rank}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row between" style={{ alignItems: "baseline" }}>
                            <b>{i?.title}</b>
                            {myRank[s.id] && <span className={`xs you ${myRank[s.id] <= 3 ? "you-top" : ""}`}>You: #{myRank[s.id]}</span>}
                          </div>
                          <div className="t3" aria-label={`${s.top3Pct}% put it in their top 3`}>
                            <span className="t3-bar"><span style={{ width: `${s.top3Pct}%` }} /></span>
                            <span className="xs"><b>{s.top3Pct}%</b> put it in their top 3</span>
                          </div>
                          {i && <ViewsBar views={s.views} a={i.pole_a} b={i.pole_b} />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <details className="card" style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Visitors without an account ({c.anon.n}) · not counted</summary>
                <p className="xs muted">Shown for comparison only. Anonymous rankings are easy to repeat, so they never shape the community list.</p>
                {c.anon.n < THRESHOLD ? <p className="small muted">Fewer than {THRESHOLD} so far.</p> : (
                  <ol className="small" style={{ paddingLeft: 20 }}>{c.anon.issues.map((s) => <li key={s.id}>{byId[s.id]?.title} <span className="muted">· {s.top3Pct}% top 3</span></li>)}</ol>
                )}
              </details>
            </section>
          )}
        </div>
        <aside className="aside-stack">
          <div className="card">
            <h2 style={{ fontSize: 16 }}>How the community list works</h2>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Only signed-in voters located here count, one ranking each. Your latest ranking replaces earlier ones.</li>
              <li>Order uses points by position: first place earns the most. &quot;Top 3&quot; is the share who put an issue in their top three.</li>
              <li>It never changes the order candidates appear in, or the default issue order.</li>
              <li>Results appear after {THRESHOLD} signed-in rankings, to protect privacy.</li>
            </ul>
            <p className="xs muted" style={{ marginTop: 8 }}><Link href={`/g/${govId}/how-built`}>See who contributed</Link></p>
          </div>
        </aside>
      </div>
    </div>
  );
}
