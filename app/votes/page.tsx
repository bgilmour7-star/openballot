import Link from "next/link";
import NextBar, { NbProgress } from "@/components/NextBar";
import { redirect } from "next/navigation";
import { getVoter, governmentsFor } from "@/lib/voter";
import { COVERED_RIDINGS } from "@/lib/location";
import { q } from "@/lib/db";
import { daysUntil, electionFor, fmtDate, getGov, racesFor, host } from "@/lib/data";
import Share from "@/components/Share";
import ElectionsTimeline, { type DayGroup, type ElectionCard } from "@/components/ElectionsTimeline";
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
  const isoDay = (d: unknown) => (d ? (typeof d === "string" ? d.slice(0, 10) : new Date(d as any).toISOString().slice(0, 10)) : "9999-12-31");
  const levelLabel = (l: string) => (l === "school" ? "School board" : l === "provincial" ? "Provincial" : "City council");
  const cards = blocks.map(({ gov, election, races, counts, questions }): ElectionCard => ({
    govId: gov.id, govName: gov.name, levelLabel: levelLabel(gov.level), ranked: ranked.has(gov.id),
    votingDay: isoDay(election?.voting_day),
    votingHours: election?.voting_hours ?? null,
    races: races.map((r) => ({ id: r.id, office: r.office, seats: r.seats, areaName: r.area_name ?? null, n: counts[r.id] ?? 0 })),
    questions: questions.map((bq: any) => ({ id: bq.id, question: bq.question, summary: bq.summary ?? null })),
    advance: (Array.isArray(election?.advance_voting) ? election.advance_voting : []).map((a: any) => ({
      date: fmtDate(a.date, { weekday: "short", month: "short", day: "numeric" }), hours: a.hours ?? null, places: a.locations ?? [], note: a.note ?? null })),
    howToVote: election?.how_to_vote ?? null, mailBallot: election?.mail_ballot ?? null,
    officialUrl: election?.official_url ?? null, officialHost: election?.official_url ? host(election.official_url) : null,
  }));
  const byDay = new Map<string, ElectionCard[]>();
  for (const c of [...cards].sort((a, b) => a.votingDay.localeCompare(b.votingDay))) byDay.set(c.votingDay, [...(byDay.get(c.votingDay) ?? []), c]);
  const groups: DayGroup[] = [...byDay.entries()].map(([day, els]) => {
    const early = [...new Set(els.flatMap((e) => e.advance.map((a) => a.date)))];
    return {
      key: day,
      weekdayMonth: fmtDate(day, { weekday: "short" }) + " · " + fmtDate(day, { month: "short" }),
      dayNum: fmtDate(day, { day: "numeric" }),
      longDate: fmtDate(day, { weekday: "long", month: "long", day: "numeric" }),
      daysLeft: daysUntil(day),
      earlyVoting: early.length ? `Vote early: ${early.length > 3 ? `${early[0]} to ${early[early.length - 1]}` : early.join(early.length === 2 ? " and " : "; ")}. ${els.length > 1 ? "Both ballots are cast at the same place." : ""}`.trim() : null,
      elections: els,
    };
  });

  return (
    <div className="wrap">
      <h1>Your elections</h1>
      <p className="page-intro">Every election you can vote in, grouped by voting day. For each one, put the issues in your order, then see which candidates have spoken to them. Select an election for its races and how to vote.</p>
      <div className="loc-bar">
        <div>
          <div className="loc-code">{postal ?? "Your street address"}</div>
          <div className="xs muted">Added from {v.located_by === "address" ? "your street address" : "your postal code"}. Results are likely, not official. <a href="https://elections.bc.ca/" target="_blank" rel="noreferrer">Confirm with Elections BC</a></div>
        </div>
        <form action={forgetLocation}><button className="btn secondary small">Change location</button></form>
      </div>
      {!v.city && (
        <p className="notice">Your local council and school board races aren&apos;t covered yet. Openballot covers the City of Nanaimo and the City of Victoria in this alpha. {v.riding && !COVERED_RIDINGS.includes(v.riding) ? "Your provincial riding isn't covered yet either." : ""} <Link href="/where">Wrong area? Check your street address.</Link></p>
      )}
      <ElectionsTimeline groups={groups} />
      <div style={{ marginTop: 16 }}><Share voterId={v.id} /></div>
      {(() => {
        const ordered = groups.flatMap((g) => g.elections);
        const nextUp = ordered.find((e) => !e.ranked);
        const done = ordered.filter((e) => e.ranked).length;
        return (
          <NextBar
            status={<><b>{done === ordered.length ? "Every election ranked" : `${done} of ${ordered.length} elections ranked`}</b><NbProgress done={done} total={ordered.length} label={nextUp ? `Next up: ${nextUp.govName}` : "See who speaks to your issues"} /></>}
            primary={nextUp ? { href: `/g/${nextUp.govId}`, label: "Rank the issues →" } : { href: `/g/${ordered[0]?.govId}/candidates`, label: "See candidates →" }} />
        );
      })()}
    </div>
  );
}
