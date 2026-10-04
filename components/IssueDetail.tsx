"use client";
import type { Issue } from "@/lib/data";

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function IssueDetail({ issue: i, rank, flip, value, onPick, onPrev, onNext, speakers, candidatesHref }: {
  issue: Issue; rank: number; flip: boolean; value: number | undefined; speakers?: number; candidatesHref?: string;
  onPick: (canonical: number) => void; onPrev?: () => void; onNext?: () => void;
}) {
  const left = flip ? i.pole_b : i.pole_a, right = flip ? i.pole_a : i.pole_b;
  const t = i.tradeoffs;
  const lt = t ? (flip ? t.b : t.a) : null, rt = t ? (flip ? t.a : t.b) : null;
  // k: 0 strongly left, 1 lean left, 2 unsure, 3 lean right, 4 strongly right (display order)
  const canon = (k: number) => (flip ? 2 - k : k - 2);
  const picked = value == null ? null : flip ? 2 - value : value + 2;
  const Pick = ({ k, label, side }: { k: number; label: string; side: string }) => (
    <button type="button" className={picked === k ? "on" : ""} aria-pressed={picked === k}
      aria-label={k === 2 ? "Unsure or somewhere in between" : `${label}: ${side}`} onClick={() => onPick(canon(k))}>
      {picked === k && <span aria-hidden>✓ </span>}{label}
    </button>
  );
  const Side = ({ letter, label, side, lean, strong }: { letter: string; label: string; side: { gains: string[]; costs: string[] } | null; lean: number; strong: number }) => {
    const on = picked === lean || picked === strong;
    return (
      <div className={`side choice ${on ? "picked" : ""}`}>
        <p className="side-pos"><span className="side-letter" aria-hidden>{letter}</span>{label}</p>
        {side && (
          <>
            <p className="side-h">Could help</p>
            <ul>{side.gains.map((g) => <li key={g}>{g}</li>)}</ul>
            <p className="side-h">Could cost</p>
            <ul>{side.costs.map((c) => <li key={c}>{c}</li>)}</ul>
          </>
        )}
        <div className="side-pick" role="group" aria-label={`How much do you agree with: ${label}`}>
          <p className="side-pick-q">{on ? "Your view" : "Closer to your view?"}</p>
          <div className="side-pick-btns">
            <Pick k={lean} label="Lean this way" side={label} />
            <Pick k={strong} label="Strongly" side={label} />
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="detail">
      <p className="xs muted" style={{ margin: 0, fontWeight: 700 }}>#{rank} on your list</p>
      <h2 style={{ marginBottom: 4 }}>{i.title}</h2>
      <p className="small" style={{ marginBottom: 12 }}>{i.description}</p>

      <section className={`stand ${value != null ? "done" : ""}`} aria-labelledby={`q-${i.id}`}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <p className="stand-kicker">{value != null ? "✓ Your view is saved" : "Where do you stand?"}</p>
          {value == null && <span className="xs muted">About 10 seconds</span>}
        </div>
        <h3 id={`q-${i.id}`}>{i.question}</h3>
        {t?.context && <p className="small muted" style={{ margin: "0 0 10px" }}>{t.context}</p>}
        <div className="sides" role="group" aria-label={i.question}>
          <Side letter="A" label={left} side={lt} lean={1} strong={0} />
          <div className="side-or"><span>or</span></div>
          <Side letter="B" label={right} side={rt} lean={3} strong={4} />
        </div>
        <div className="unsure-pick"><Pick k={2} label="Unsure, or somewhere in between" side="" /></div>
        <p className="xs muted" style={{ margin: "8px 0 0" }}>Pick the option closer to your view. Trade-offs are a balanced summary, not a prediction. Tap your choice again to clear it.</p>
      </section>

      {candidatesHref && (
        <a className="speakers" href={candidatesHref}>
          <span><b>{speakers ? `${speakers} ${speakers === 1 ? "candidate has" : "candidates have"} said something about this` : "No candidate on your ballot has said anything about this yet"}</b>
          <span className="xs muted" style={{ display: "block" }}>{speakers ? (value != null ? "See where they stand compared with your view" : "Add your view above to compare") : "We add positions as candidates publish them"}</span></span>
          {speakers ? <span className="chev" aria-hidden>›</span> : null}
        </a>
      )}
      <dl className="facts small">
        <dt>Who it affects</dt><dd>{i.what_it_affects}</dd>
        <dt>What this government can do</dt><dd>{i.who_decides}</dd>
      </dl>
      {i.sources?.length ? (
        <p className="xs muted">Why it&apos;s on the list: {i.sources.slice(0, 3).map((s, k) => <a key={k} href={s} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{host(s)}</a>)}</p>
      ) : null}
      <div className="row between" style={{ marginTop: 8 }}>
        <button className="btn ghost small" disabled={!onPrev} onClick={onPrev}>← Previous issue</button>
        <button className="btn ghost small" disabled={!onNext} onClick={onNext}>Next issue →</button>
      </div>
    </div>
  );
}
