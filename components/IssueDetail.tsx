"use client";
import type { Issue } from "@/lib/data";

const LABELS = ["Strongly", "Lean", "Unsure", "Lean", "Strongly"];
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function IssueDetail({ issue: i, rank, flip, value, onPick, onPrev, onNext }: {
  issue: Issue; rank: number; flip: boolean; value: number | undefined;
  onPick: (canonical: number) => void; onPrev?: () => void; onNext?: () => void;
}) {
  const left = flip ? i.pole_b : i.pole_a, right = flip ? i.pole_a : i.pole_b;
  const t = i.tradeoffs;
  const lt = t ? (flip ? t.b : t.a) : null, rt = t ? (flip ? t.a : t.b) : null;
  const Side = ({ label, side }: { label: string; side: { gains: string[]; costs: string[] } | null }) => (
    <div className="side">
      <p className="side-pos">{label}</p>
      {side && (
        <>
          <p className="side-h">Could help</p>
          <ul>{side.gains.map((g) => <li key={g}>{g}</li>)}</ul>
          <p className="side-h">Could cost</p>
          <ul>{side.costs.map((c) => <li key={c}>{c}</li>)}</ul>
        </>
      )}
    </div>
  );
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
        <div className="sides">
          <Side label={left} side={lt} />
          <Side label={right} side={rt} />
        </div>
        <div className="scale big" role="group" aria-label={i.question}>
          {[0, 1, 2, 3, 4].map((k) => {
            const canonical = flip ? 2 - k : k - 2;
            const side = k < 2 ? left : k > 2 ? right : "";
            return (
              <button key={k} className={value === canonical ? "on" : ""} aria-pressed={value === canonical}
                aria-label={k === 2 ? "Unsure or in between" : `${LABELS[k]}: ${side}`} onClick={() => onPick(canonical)}>
                {LABELS[k]}
              </button>
            );
          })}
        </div>
        <p className="xs muted" style={{ margin: "8px 0 0" }}>Trade-offs are a balanced summary, not a prediction. Tap your choice again to clear it.</p>
      </section>

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
