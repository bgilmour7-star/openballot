import Link from "next/link";
import { getVoter } from "@/lib/voter";
import PostalForm from "@/components/PostalForm";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = {
  postal: "That doesn't look like a Canadian postal code. Try the format V9R 5J9.",
  lookup: "We couldn't look that up just now. Please try again in a moment.",
};

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const v = await getVoter();
  const located = !!(v?.postal_code && (v.city || v.riding));
  return (
    <div className="landing">
      <section className="hero-band">
        <div className="hero-bg" aria-hidden><i /><i /><i /></div>
        <div className="wrap wide hero-grid">
          <div>
            <p className="eyebrow">Free · Non-partisan · No account needed to start</p>
            <h1 className="hero-title">Start with <span className="hl">the issues</span>.<br />Choose the person.</h1>
            <p className="hero-sub">See every vote on your ballot, decide what matters most to you, then see which candidates have actually spoken to it. Every fact has a source, and we never tell you who to vote for.</p>
            {located ? (
              <div className="stack">
                <Link className="btn big" href="/votes">Continue to your ballot</Link>
                <p className="xs muted">Set up for {v!.postal_code!.slice(0, 3)} {v!.postal_code!.slice(3)}. <Link href="#start">Use a different postal code</Link></p>
              </div>
            ) : (
              <>
                <PostalForm refId={sp.r} postal={sp.postal} />
                <p className="xs muted" style={{ marginTop: 8 }}>Takes about 3 minutes. Your postal code only finds your elections; we never store your address.</p>
              </>
            )}
            {sp.err && <p className="notice" style={{ marginTop: 12 }}>{ERR[sp.err] ?? "Something went wrong."}</p>}
            <p className="coverage"><span className="dot-live" aria-hidden /> Now in alpha for elections in Nanaimo and Victoria, BC</p>
          </div>
          <div className="preview" aria-hidden>
            <div className="pv-card">
              <p className="pv-k">Your top issues</p>
              <div className="pv-sort">
                <div className="pv-nums"><span>1</span><span>2</span><span>3</span></div>
                <div className="pv-rows">
                  <div className="pv-row r-housing">Housing costs and supply</div>
                  <div className="pv-row r-safety">Community safety</div>
                  <div className="pv-row r-taxes">Property taxes</div>
                </div>
              </div>
            </div>
            <div className="pv-card pv-offset">
              <p className="pv-k">Speaks to your top issues</p>
              <div className="pv-cand"><b>Candidate A</b><div className="pv-chips"><i>Housing</i><i>Safety</i></div></div>
              <div className="pv-cand"><b>Candidate B</b><div className="pv-chips"><i>Housing</i><i>Taxes</i></div></div>
              <p className="pv-src">Each position links to its source</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap wide band">
        <h2 className="band-title">How it works</h2>
        <ol className="steps">
          <li><span className="step-n">1</span><h3>See your whole ballot</h3><p>Enter a postal code to see every election you can vote in: council, school board and provincial, with dates and how to vote.</p></li>
          <li><span className="step-n">2</span><h3>Rank what matters</h3><p>Put your community&apos;s issues in order and say where you stand, with the trade-offs of each choice laid out.</p></li>
          <li><span className="step-n">3</span><h3>See who speaks to it</h3><p>Candidates grouped by how much they&apos;ve said about your top issues. Never ranked, never recommended.</p></li>
        </ol>
      </section>

      <section className="wrap wide band">
        <h2 className="band-title">Why it&apos;s different</h2>
        <div className="why">
          <div><h3>Issues first, not platforms</h3><p>Most voting tools ask you to react to what candidates say. Openballot starts with what you care about.</p></div>
          <div><h3>Neutral by design</h3><p>Candidates appear in random order within groups, and party labels are plain and only shown when official. No ads, and no money from candidates or parties.</p></div>
          <div><h3>Every fact has a source</h3><p>Positions are short, neutral summaries linked to where they were said. If there&apos;s nothing on record, we say so.</p></div>
        </div>
      </section>

      <section className="wrap wide band">
        <h2 className="band-title">Questions</h2>
        <div className="faq">
          <details><summary>Is it free?</summary><p>Yes. Voters never pay, and you can use it without an account. Signing in lets your ranking count toward your community&apos;s issue list.</p></details>
          <details><summary>Will it tell me who to vote for?</summary><p>No. It shows which candidates have spoken to the issues you care about, with sources, so you can decide.</p></details>
          <details><summary>Who runs Openballot?</summary><p>An independent project. It isn&apos;t run by any government, party or candidate. <Link href="/about">How it works</Link></p></details>
          <details><summary>What happens to my information?</summary><p>Your postal code finds your elections. Your rankings are yours; community results are only ever shown as totals. <Link href="/privacy">Privacy note</Link></p></details>
        </div>
      </section>

      <section className="cta-band" id="start">
        <div className="wrap wide">
          <h2>Your next vote is closer than you think.</h2>
          <p>Find out what&apos;s on your ballot in under a minute.</p>
          <PostalForm id="postal-2" refId={sp.r} />
        </div>
      </section>
    </div>
  );
}
