import Link from "next/link";
import { locate } from "./actions";
import { getVoter } from "@/lib/voter";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = {
  postal: "That doesn't look like a Canadian postal code. Try the format V9R 5J9.",
  lookup: "We couldn't look that up just now. Please try again in a moment.",
};

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const v = await getVoter();
  return (
    <div className="wrap">
      <section className="hero">
        <h1>Start with the issues. Choose the person.</h1>
        <p className="muted">Nanaimo and Victoria vote twice this month: local elections on Saturday, October 17, and the provincial election on Saturday, October 24. Enter your postal code to see every vote you have, rank what matters to you, then see which candidates speak to it.</p>
      </section>
      {v?.postal_code && (v.city || v.riding) ? (
        <div className="notice info" style={{ marginBottom: 16 }}>
          You&apos;re set up for {v.postal_code.slice(0, 3)} {v.postal_code.slice(3)}. <Link href="/votes"><b>Go to your votes</b></Link>
        </div>
      ) : null}
      <form action={locate} className="card">
        <label htmlFor="postal">Your postal code</label>
        <p className="hint">Used only to find your elections. We don&apos;t need your name to start.</p>
        <input type="hidden" name="ref" value={sp.r ?? ""} />
        <div className="postal">
          <input id="postal" name="postal" type="text" inputMode="text" autoComplete="postal-code" placeholder="V9R 5J9" maxLength={7} required defaultValue={sp.postal ?? ""} />
          <button className="btn">Find my votes</button>
        </div>
        {sp.err && <p className="notice" style={{ marginTop: 12 }}>{ERR[sp.err] ?? "Something went wrong."}</p>}
      </form>
      <div className="card">
        <h2>How it works</h2>
        <ol className="small" style={{ paddingLeft: 20, margin: 0 }}>
          <li><b>Your votes.</b> Every election for your address: council, school board and your provincial riding, with dates and how to vote.</li>
          <li><b>Rank the issues.</b> Put your community&apos;s issues in order and say where you stand.</li>
          <li><b>See who speaks to them.</b> Candidates grouped by how much they&apos;ve said about your top issues, with a source for everything. Never ranked or recommended.</li>
        </ol>
      </div>
      <p className="xs muted">Covers the City of Nanaimo, the City of Victoria and their provincial ridings for October 2026. Alpha: information was gathered from public sources on October 3 and is being checked. <Link href="/about">How it works</Link></p>
    </div>
  );
}
