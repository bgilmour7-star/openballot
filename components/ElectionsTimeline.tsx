"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type ElectionCard = {
  govId: string; govName: string; levelLabel: string; ranked: boolean;
  votingDay: string; votingHours: string | null;
  races: { id: string; office: string; seats: number; areaName: string | null; n: number }[];
  questions: { id: string; question: string; summary: string | null }[];
  advance: { date: string; hours: string | null; places: string[]; note: string | null }[];
  howToVote: string | null; mailBallot: string | null; officialUrl: string | null; officialHost: string | null;
};
export type DayGroup = { key: string; weekdayMonth: string; dayNum: string; longDate: string; daysLeft: number | null; earlyVoting: string | null; elections: ElectionCard[] };

const raceLine = (r: ElectionCard["races"][number]) =>
  `${r.office} ${r.n} ${r.n === 1 ? "candidate" : "candidates"}${r.seats > 1 ? `, vote for up to ${r.seats}` : ""}`;

export default function ElectionsTimeline({ groups }: { groups: DayGroup[] }) {
  const [open, setOpen] = useState<{ e: ElectionCard; g: DayGroup } | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", esc);
    document.getElementById("drawer-close")?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <>
      {groups.map((g) => (
        <section className="day-group" key={g.key} aria-label={`Voting day ${g.longDate}`}>
          <div className="day-rail">
            <span className="day-wm">{g.weekdayMonth}</span>
            <span className="day-num">{g.dayNum}</span>
            {g.daysLeft != null && g.daysLeft >= 0 && <span className="day-left">{g.daysLeft === 0 ? "Today" : `${g.daysLeft} ${g.daysLeft === 1 ? "day" : "days"} left`}</span>}
          </div>
          <div className="day-cards">
            {g.elections.map((e) => (
              <article key={e.govId} className="el-card" onClick={(ev) => { if (!(ev.target as HTMLElement).closest("a,button")) setOpen({ e, g }); }}>
                <div className="el-top">
                  <div>
                    <p className="el-level">{e.levelLabel}</p>
                    <h2 className="el-name"><button type="button" className="el-open" onClick={() => setOpen({ e, g })} aria-haspopup="dialog">{e.govName}</button></h2>
                  </div>
                  {e.ranked ? <span className="badge done">✓ Ranked</span> : <span className="badge todo">Not ranked yet</span>}
                </div>
                <p className="el-races">{e.races.map((r, i) => <span key={r.id}>{i > 0 && " · "}{r.office} <b>{r.n} {r.n === 1 ? "candidate" : "candidates"}</b>{r.seats > 1 ? `, vote for up to ${r.seats}` : ""}</span>)}</p>
                <div className="el-actions">
                  {e.ranked ? (
                    <>
                      <Link className="btn" href={`/g/${e.govId}/candidates`}>See candidates</Link>
                      <Link className="btn secondary" href={`/g/${e.govId}`}>Review your issues</Link>
                    </>
                  ) : (
                    <>
                      <Link className="btn" href={`/g/${e.govId}`}>Rank the issues</Link>
                      <Link className="btn secondary" href={`/g/${e.govId}/candidates`}>See candidates</Link>
                    </>
                  )}
                  <button type="button" className="el-more" onClick={() => setOpen({ e, g })} aria-haspopup="dialog">Details and how to vote ›</button>
                </div>
              </article>
            ))}
            {g.earlyVoting && <p className="day-early">{g.earlyVoting}</p>}
          </div>
        </section>
      ))}

      {open && (
        <div className="drawer-wrap" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <button className="drawer-backdrop" aria-label="Close" onClick={() => setOpen(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <span className="sheet-grab" aria-hidden />
              <div className="drawer-title-row">
                <div>
                  <p className="el-level">{open.e.levelLabel}</p>
                  <h2 id="drawer-title" className="drawer-title">{open.e.govName}</h2>
                </div>
                <button id="drawer-close" className="btn ghost small" onClick={() => setOpen(null)}>Close</button>
              </div>
            </div>
            <div className="drawer-body">
              <p className="drawer-day"><b>Voting day: {open.g.longDate}</b>{open.e.votingHours ? `, ${open.e.votingHours}` : ""}{open.g.daysLeft != null && open.g.daysLeft >= 0 ? ` · ${open.g.daysLeft === 0 ? "today" : `${open.g.daysLeft} days left`}` : ""}</p>
              <div className="el-actions" style={{ marginTop: 0 }}>
                <Link className="btn" href={`/g/${open.e.govId}`}>{open.e.ranked ? "Review your issues" : "Rank the issues"}</Link>
                <Link className="btn secondary" href={`/g/${open.e.govId}/candidates`}>See candidates</Link>
              </div>

              <h3 className="drawer-h">On your ballot</h3>
              <ul className="drawer-races">
                {open.e.races.map((r) => (
                  <li key={r.id}>
                    <Link href={`/g/${open.e.govId}/candidates?race=${r.id}`}>
                      <span><b>{r.office}</b><span className="xs muted">{r.areaName ? ` · ${r.areaName}` : ""}</span><br /><span className="small muted">{r.seats > 1 ? `Vote for up to ${r.seats}` : "Vote for 1"} · {r.n} {r.n === 1 ? "candidate" : "candidates"}</span></span>
                      <span className="chev" aria-hidden>›</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="sr-only">{open.e.races.map(raceLine).join(". ")}</p>

              {open.e.questions.length > 0 && (
                <>
                  <h3 className="drawer-h">Also on this ballot</h3>
                  {open.e.questions.map((q) => <p key={q.id} className="small"><b>{q.question}</b>{q.summary ? <><br /><span className="muted">{q.summary}</span></> : null}</p>)}
                </>
              )}

              <h3 className="drawer-h">How to vote</h3>
              {open.e.advance.length > 0 && (
                <div className="drawer-advance">
                  <p className="small" style={{ marginBottom: 6 }}><b>Vote early</b></p>
                  <ul>
                    {open.e.advance.map((a) => (
                      <li key={a.date} className="small"><b>{a.date}</b>{a.hours ? `, ${a.hours}` : ""}{a.places.length ? <><br /><span className="muted">{a.places.join("; ")}</span></> : null}{a.note ? <><br /><span className="muted">{a.note}</span></> : null}</li>
                    ))}
                  </ul>
                </div>
              )}
              {open.e.howToVote && <p className="small">{open.e.howToVote}</p>}
              {open.e.mailBallot && <p className="small"><b>By mail:</b> {open.e.mailBallot}</p>}
              {open.e.officialUrl && <p className="small">Official source: <a href={open.e.officialUrl} target="_blank" rel="noreferrer">{open.e.officialHost}</a></p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
