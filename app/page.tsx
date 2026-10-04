import Link from "next/link";
import { getVoter } from "@/lib/voter";
import PostalForm from "@/components/PostalForm";
import LandingIcon from "@/components/LandingIcon";

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
            <h1 className="hero-title"><span className="hl">You</span> set the agenda.<br />Candidates show up to it.</h1>
            <p className="hero-sub">A local ballot can list dozens of candidates. Instead of starting with their slogans, Openballot starts with what you care about, then shows who has actually spoken to it, with a source for every claim.</p>
            {located ? (
              <div className="stack">
                <Link className="btn big" href="/votes">Continue to your ballot</Link>
                <p className="xs muted">Set up for {v!.postal_code!.slice(0, 3)} {v!.postal_code!.slice(3)}. <Link href="#start">Use a different postal code</Link></p>
              </div>
            ) : (
              <>
                <PostalForm refId={sp.r} postal={sp.postal} />
                <p className="xs muted" style={{ marginTop: 8 }}>About 3 minutes. Free, no account needed, and we never store your address.</p>
              </>
            )}
            {sp.err && <p className="notice" style={{ marginTop: 12 }}>{ERR[sp.err] ?? "Something went wrong."}</p>}
            <p className="coverage"><span className="dot-live" aria-hidden /> Now in alpha for elections in Nanaimo and Victoria, BC</p>
          </div>
          <div className="phone-wrap" aria-hidden>
            <div className="phone">
              <div className="phone-screen">
                <p className="ph-k">Your city council</p>
                <p className="ph-h">What matters to you?</p>
                <div className="pv-sort">
                  <div className="pv-nums"><span>1</span><span>2</span><span>3</span></div>
                  <div className="pv-rows">
                    <div className="pv-row r-housing">Housing costs</div>
                    <div className="pv-row r-safety">Community safety</div>
                    <div className="pv-row r-taxes">Property taxes</div>
                  </div>
                </div>
                <div className="ph-match">
                  <p className="ph-mk">Speaks to your top 3</p>
                  <div className="ph-c">Candidate A<span>●●</span></div>
                  <div className="ph-c">Candidate B<span>●●</span></div>
                  <div className="ph-c">Candidate C<span>●○</span></div>
                  <p className="ph-note">Random order. Every position links to its source.</p>
                </div>
              </div>
            </div>
            <div className="phone-tag"><LandingIcon name="check" size={20} />You put housing first</div>
          </div>
        </div>
      </section>

      <section className="wrap wide band">
        <h2 className="band-title">Why we built this</h2>
        <p className="band-sub">Local elections decide your rent, your roads and your schools, but they are the hardest to research.</p>
        <div className="why-grid">
          <div className="why-item"><span className="ico-tile"><LandingIcon name="people" /></span><div><h3>Dozens of names</h3><p>Mayor, council and school board races can put dozens of candidates on one ballot.</p></div></div>
          <div className="why-item"><span className="ico-tile"><LandingIcon name="sign" /></span><div><h3>A lawn sign is a name</h3><p>Not a position. Positions are spread across dozens of websites and forums.</p></div></div>
          <div className="why-item"><span className="ico-tile"><LandingIcon name="calendar" /></span><div><h3>More than one election</h3><p>Local, school board and provincial races can land weeks apart. Openballot puts every race you can vote in on one ballot.</p></div></div>
        </div>
      </section>

      <section className="wrap wide band" id="how">
        <h2 className="band-title">How it works</h2>
        <ol className="steps">
          <li><span className="step-ico"><LandingIcon name="pin" size={36} stroke={1.8} /></span><p className="step-k">Step 1</p><h3>See your whole ballot</h3><p>Your postal code finds every race you can vote in, with dates, voting places and how to vote by mail.</p></li>
          <li><span className="step-ico"><LandingIcon name="list" size={36} stroke={1.8} /></span><p className="step-k">Step 2</p><h3>Put your issues in order</h3><p>Drag your community&apos;s issues into your order and say where you stand, with the trade-offs of each choice laid out.</p></li>
          <li><span className="step-ico"><LandingIcon name="search" size={36} stroke={1.8} /></span><p className="step-k">Step 3</p><h3>See who speaks to it</h3><p>Candidates grouped by how much they&apos;ve said about your top issues, each statement linked to where they said it.</p></li>
        </ol>
      </section>

      <section className="rules-band">
        <div className="wrap wide">
          <h2>Built so the decision stays yours</h2>
          <p className="rules-sub">Openballot isn&apos;t run by any government, party or candidate. These rules are built into the product.</p>
          <div className="rules">
            <div><LandingIcon name="shield" size={28} /><h3>Never a recommendation</h3><p>We show who has spoken to your issues, not who to vote for.</p></div>
            <div><LandingIcon name="link" size={28} /><h3>Every claim has a source</h3><p>Each position links to the candidate&apos;s own words or reporting.</p></div>
            <div><LandingIcon name="shuffle" size={28} /><h3>Random order, every time</h3><p>No candidate gets the top spot by default.</p></div>
            <div><LandingIcon name="lock" size={28} /><h3>Your address stays yours</h3><p>A postal code finds your races. We never store your street address.</p></div>
          </div>
        </div>
      </section>

      <section className="wrap wide band">
        <h2 className="band-title">Questions</h2>
        <div className="faq">
          <details><summary>Is it free?</summary><p>Yes. Voters never pay, and you can use it without an account. Signing in lets your ranking count toward the community issue ranking.</p></details>
          <details><summary>Will it tell me who to vote for?</summary><p>No. It shows which candidates have spoken to the issues you care about, with sources, so you can decide.</p></details>
          <details><summary>Who runs Openballot?</summary><p>An independent project. It isn&apos;t run by any government, party or candidate. <Link href="/about">How it works</Link></p></details>
          <details><summary>What happens to my information?</summary><p>Your postal code finds your elections. Your rankings are yours; the community issue ranking is only ever shown as totals. <Link href="/privacy">Privacy note</Link></p></details>
        </div>
      </section>

      <section className="cta-band" id="start">
        <div className="wrap wide">
          <h2>You do the deciding. We did the reading.</h2>
          <p>Three minutes now, a lot more confidence at the ballot box.</p>
          <PostalForm id="postal-2" refId={sp.r} />
        </div>
      </section>
    </div>
  );
}
