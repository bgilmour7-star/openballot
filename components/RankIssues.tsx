"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveRanking, saveView } from "@/app/actions";
import type { Issue } from "@/lib/data";

const TOP = 3;
const LABELS = ["Strongly", "Lean", "Unsure", "Lean", "Strongly"];

export default function RankIssues({ govId, issues, initialOrder, initialViews, saved, flip }: {
  govId: string; issues: Issue[]; initialOrder: string[]; initialViews: Record<string, number>; saved: boolean; flip: Record<string, boolean>;
}) {
  const byId = Object.fromEntries(issues.map((i) => [i.id, i]));
  const [order, setOrder] = useState(initialOrder);
  const [views, setViews] = useState(initialViews);
  const [isSaved, setSaved] = useState(saved);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [announce, setAnnounce] = useState("");

  function move(idx: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [it] = next.splice(idx, 1);
    next.splice(to, 0, it);
    setOrder(next); setDirty(true);
    setAnnounce(`${byId[it].title} moved to position ${to + 1}`);
  }
  function save() {
    start(async () => { await saveRanking(govId, order); setSaved(true); setDirty(false); setAnnounce("Ranking saved"); });
  }
  function pick(issueId: string, canonical: number) {
    const value = views[issueId] === canonical ? null : canonical;
    setViews((v) => { const n = { ...v }; if (value === null) delete n[issueId]; else n[issueId] = value; return n; });
    start(async () => { await saveView(issueId, value); });
  }

  const top = order.slice(0, TOP);
  return (
    <div className="split">
      <div>
        <h2>Which issues matter most to you?</h2>
        <p className="muted small">Move the issues into your order. Your top {TOP} decide which candidates show first. Tap an issue to read what it covers.</p>
        <div aria-live="polite" className="xs muted" style={{ minHeight: 18 }}>{announce}</div>
        <ol className="list" style={{ padding: 0 }}>
          {order.map((id, idx) => {
            const i = byId[id];
            if (!i) return null;
            return (
              <li key={id} className={`rank-item ${idx < TOP ? "top" : ""}`} style={{ borderTop: undefined }}>
                <span className="rank-num">{idx + 1}</span>
                <details className="rank-body">
                  <summary>{i.title}</summary>
                  <p className="small" style={{ marginTop: 6 }}>{i.description}</p>
                  <p className="xs muted"><b>Affects:</b> {i.what_it_affects}<br /><b>What this government can do:</b> {i.who_decides}</p>
                  {i.sources?.length ? <p className="xs muted">Why it&apos;s on the list: {i.sources.slice(0, 3).map((s, k) => <a key={k} href={s} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>source {k + 1}</a>)}</p> : null}
                </details>
                <button className="icon-btn" aria-label={`Move ${i.title} up`} disabled={idx === 0} onClick={() => move(idx, idx - 1)}>↑</button>
                <button className="icon-btn" aria-label={`Move ${i.title} down`} disabled={idx === order.length - 1} onClick={() => move(idx, idx + 1)}>↓</button>
              </li>
            );
          })}
        </ol>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={save} disabled={pending || (isSaved && !dirty)}>{isSaved && !dirty ? "Ranking saved" : pending ? "Saving…" : "Save my ranking"}</button>
          {isSaved && <Link className="btn secondary" href={`/g/${govId}/candidates`}>See candidates</Link>}
        </div>
        {!isSaved && <p className="xs muted" style={{ marginTop: 8 }}>Saved on this device. <Link href="/signin">Sign in</Link> to make your ranking count toward your community&apos;s list.</p>}
      </div>
      <div>
        <h2 style={{ marginTop: 16 }}>Your view on your top issues</h2>
        <p className="muted small">Optional. Two fair positions people hold; pick where you sit, or skip. Tap again to clear.</p>
        {top.map((id) => {
          const i = byId[id];
          if (!i) return null;
          const f = flip[id];
          const left = f ? i.pole_b : i.pole_a, right = f ? i.pole_a : i.pole_b;
          return (
            <div className="card" key={id}>
              <p className="xs muted" style={{ margin: 0 }}>{i.title}</p>
              <h3>{i.question}</h3>
              <div className="poles"><span>{left}</span><span>{right}</span></div>
              <div className="scale" role="group" aria-label={i.question}>
                {[0, 1, 2, 3, 4].map((k) => {
                  const canonical = f ? 2 - k : k - 2;
                  const side = k < 2 ? left : k > 2 ? right : "";
                  return (
                    <button key={k} className={views[id] === canonical ? "on" : ""} aria-pressed={views[id] === canonical}
                      aria-label={k === 2 ? "Unsure or in between" : `${LABELS[k]}: ${side}`} onClick={() => pick(id, canonical)}>{LABELS[k]}</button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
