import Link from "next/link";
import { locateAddress } from "../actions";
import { getVoter } from "@/lib/voter";
import { coveredMunicipalities, listJoin } from "@/lib/data";

export const dynamic = "force-dynamic";
const MSG: Record<string, string> = {
  unknown: "We couldn't find that postal code. It may be new, since postal codes for new buildings can take a while to reach the maps we use. Your street address will work instead.",
  boundary: "Your postal code is near a city or riding boundary, so we need your street address to be sure which votes are yours.",
  outside: "That postal code doesn't look like it's in a municipality Openballot covers yet. If you think it is, try your street address.",
  address: "Please enter a street address, like 455 Wallace St, Nanaimo.",
  nomatch: "We couldn't match that address. Check the number and street name, and include the city.",
  lookup: "We couldn't look that up just now. Please try again in a moment.",
};

export default async function Where({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const [v, places] = await Promise.all([getVoter(), coveredMunicipalities()]);
  const msg = MSG[sp.err ?? sp.reason ?? "boundary"];
  return (
    <div className="wrap">
      <h1>Let&apos;s confirm where you vote</h1>
      <p className={sp.err ? "notice" : "muted"}>{msg}</p>
      <form action={locateAddress} className="card">
        <label htmlFor="address">Street address</label>
        <p className="hint">Used once to find your elections, then discarded. We never store your address.</p>
        <input id="address" name="address" type="text" autoComplete="street-address" placeholder="455 Wallace St, Nanaimo" required />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn">Check my address</button>
          {v?.riding || v?.city ? <Link className="btn ghost" href="/votes">Skip, use my postal code</Link> : <Link className="btn ghost" href="/">Try another postal code</Link>}
        </div>
      </form>
      <p className="xs muted">Openballot covers {listJoin(places)} for now. You can always check with <a href="https://elections.bc.ca/" target="_blank" rel="noreferrer">Elections BC</a> or your municipality.</p>
    </div>
  );
}
