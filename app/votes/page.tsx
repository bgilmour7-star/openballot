import Link from "next/link";
import { redirect } from "next/navigation";
import { getVoter, governmentsFor } from "@/lib/voter";
import { COVERED_RIDINGS } from "@/lib/location";
import { q } from "@/lib/db";
import { daysUntil, electionFor, fmtDate, getGov, racesFor, host } from "@/lib/data";
import Share from "@/components/Share";
import { forgetLocation } from "../actions";

export const dynamic = "force-dynamic";

export default async function Votes() {
  const v = await getVoter();
  if (!v || (!v.city && !v.riding)) redirect("/");
  const govIds = governmentsFor(v).filter((g) => g !== "province-of-bc" || COVERED_RIDINGS.includes(v.riding ?? ""));
  const rankings = await q<{ government_id: string }>(`select government_id from rankings where voter_id=$1`, [v.id]);
  const ranked = new Set(rankings.map((r) => r.government_id));
  const blocks = await Promise.all(govIds.map(async (gid) => {
    const [gov, election, races] = await Promise.all([getGov(gid), electionFor(gid), racesFor(v, gid)]);
    const counts = races.length ? await q<{ race_id: string; n: number }>(
      `select race_id, count(*)::int n from candidacies where race_id = any($1) and status <> 'withdrawn' group by race_id`, [races.map((r) => r.id)]) : [];
    const questions = election ? await q(`select * from ballot_questions where election_id=$1`, [election.id]) : [];
    return { gov: gov!, election: election!, races, counts: Object.fromEntries(counts.map((c) => [c.race_id, c.n])), questions };
  }));
  const postal = v.postal_code ? `${v.postal_code.slice(0, 3)} ${v.postal_code.slice(3)}` : null;
  const byDate = [...blocks].sort((a, b) => String(a.election?.voting_day).localeCompare(String(b.election?.voting_day)));

  return (
    <div className="wrap wide">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div>
          <h1>Your votes</h1>
          <p className="muted small">
            <span className="badge done">Added from {v.located_by === "address" ? "your address" : `postal code ${postal}`}</span>{" "}
            Results are likely, not official. <a href="https://elections.bc.ca/" target="_blank" rel="noreferrer">Confirm with Elections BC</a>.
          </p>
        </div>
        <form action={forgetLocation}><button className="btn ghost small">Change</button></form>
      </div>
      {!v.city && (
        <p className="notice">Your local council and school board races aren&apos;t covered yet. Openballot covers the City of Nanaimo and the City of Victoria in this alpha. {v.riding && !COVERED_RIDINGS.includes(v.riding) ? "Your provincial riding isn't covered yet either." : ""} <Link href="/where">Wrong area? Check your street address.</Link></p>
      )}
      <div className="votes-grid">
      {byDate.map(({ gov, election, races, counts, questions }) => {
        const days = daysUntil(election?.voting_day);
        return (
          <section className="card" key={gov.id}>
            <div className="gov-head">
              <div>
                <p className="xs muted" style={{ margin: 0, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{gov.level === "school" ? "School board" : gov.level === "provincial" ? "Provincial" : "City council"}</p>
                <h2>{gov.name}</h2>
                <p className="small" style={{ margin: 0 }}><b>Voting day: {fmtDate(election?.voting_day, { weekday: "long", month: "long", day: "numeric" })}</b>{election?.voting_hours ? `, ${election.voting_hours}` : ""}</p>
              </div>
              {days != null && days >= 0 && <div style={{ textAlign: "right" }}><div className="countdown">{days}</div><div className="xs muted">{days === 1 ? "day" : "days"} left</div></div>}
            </div>
            <ul className="list" style={{ marginTop: 8 }}>
              {races.map((r) => (
                <li key={r.id} className="row between">
                  <div><b>{r.office}</b>{r.seats > 1 ? <span className="muted"> · vote for up to {r.seats}</span> : null}<div className="xs muted">{r.area_name}</div></div>
                  <span className="small muted">{counts[r.id] ?? 0} candidates</span>
                </li>
              ))}
            </ul>
            {questions.length > 0 && (
              <div className="card flat" style={{ background: "var(--soft)" }}>
                <h3>Also on this ballot</h3>
                {questions.map((bq: any) => (
                  <p key={bq.id} className="small"><b>{bq.question}</b><br /><span className="muted">{bq.summary}</span></p>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn" href={`/g/${gov.id}`}>{ranked.has(gov.id) ? "Review your issues" : "Rank the issues"}</Link>
              <Link className="btn secondary" href={`/g/${gov.id}/candidates`}>See candidates</Link>
              {ranked.has(gov.id) ? <span className="badge done">Ranked</span> : <span className="badge todo">Not ranked yet</span>}
            </div>
            <details style={{ marginTop: 12 }}>
              <summary className="small" style={{ cursor: "pointer", color: "var(--action)", fontWeight: 700 }}>When and how to vote</summary>
              <div className="small" style={{ marginTop: 8 }}>
                {Array.isArray(election?.advance_voting) && election.advance_voting.length > 0 && (
                  <p><b>Advance voting:</b> {election.advance_voting.map((a: any) => fmtDate(a.date)).join(", ")}
                    {election.advance_voting[0]?.hours ? ` (${election.advance_voting[0].hours})` : ""}
                    {election.advance_voting[0]?.locations?.length ? ` at ${[...new Set(election.advance_voting.flatMap((a: any) => a.locations ?? []))].join("; ")}` : ""}
                    {election.advance_voting[0]?.note ? `. ${election.advance_voting[0].note}` : ""}</p>
                )}
                {election?.how_to_vote && <p>{election.how_to_vote}</p>}
                {election?.mail_ballot && <p><b>By mail:</b> {election.mail_ballot}</p>}
                {election?.official_url && <p>Official source: <a href={election.official_url} target="_blank" rel="noreferrer">{host(election.official_url)}</a></p>}
              </div>
            </details>
          </section>
        );
      })}
      </div>
      <div style={{ marginTop: 16 }}><Share voterId={v.id} /></div>
    </div>
  );
}
