"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveRanking, saveView } from "@/app/actions";
import type { Issue } from "@/lib/data";

const TOP = 3;
const LABELS = ["Strongly", "Lean", "Unsure", "Lean", "Strongly"];
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function RankIssues({ govId, issues, initialOrder, initialViews, saved, flip }: {
  govId: string; issues: Issue[]; initialOrder: string[]; initialViews: Record<string, number>; saved: boolean; flip: Record<string, boolean>;
}) {
  const byId = Object.fromEntries(issues.map((i) => [i.id, i]));
  const [order, setOrder] = useState(initialOrder);
  const [views, setViews] = useState(initialViews);
  const [selected, setSelected] = useState<string>(initialOrder[0]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">(saved ? "saved" : "idle");
  const [everSaved, setEverSaved] = useState(saved);
  const [dragId, setDragId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [, start] = useTransition();
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  // Auto-save the ranking shortly after it changes.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      start(async () => { await saveRanking(govId, order); setStatus("saved"); setEverSaved(true); });
    }, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [order, govId]);

  function moveTo(id: string, to: number, say = true) {
    setOrder((cur) => {
      const from = cur.indexOf(id);
      if (from < 0 || to < 0 || to >= cur.length || from === to) return cur;
      const next = [...cur]; next.splice(from, 1); next.splice(to, 0, id);
      if (say) setAnnounce(`${byId[id].title} moved to position ${to + 1}`);
      return next;
    });
  }

  // Pointer-based drag (mouse and touch) on the grip handle.
  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const y = e.clientY;
    const ids = order;
    for (let k = 0; k < ids.length; k++) {
      const el = refs.current[ids[k]];
      if (!el || ids[k] === dragId) continue;
      const r = el.getBoundingClientRect();
      if (y > r.top && y < r.bottom) {
        const from = ids.indexOf(dragId);
        const mid = r.top + r.height / 2;
        if ((from < k && y > mid) || (from > k && y < mid)) moveTo(dragId, k, false);
        break;
      }
    }
  }
  function onPointerUp() {
    if (dragId) setAnnounce(`${byId[dragId].title} is now number ${order.indexOf(dragId) + 1}`);
    setDragId(null);
  }

  function pick(issueId: string, canonical: number) {
    const value = views[issueId] === canonical ? null : canonical;
    setViews((v) => { const n = { ...v }; if (value === null) delete n[issueId]; else n[issueId] = value; return n; });
    start(async () => { await saveView(issueId, value); });
  }

  const topDone = order.slice(0, TOP).filter((id) => views[id] != null).length;
  const sel = byId[selected];
  const selIdx = order.indexOf(selected);

  const Detail = ({ id }: { id: string }) => {
    const i = byId[id];
    if (!i) return null;
    const f = flip[id];
    const left = f ? i.pole_b : i.pole_a, right = f ? i.pole_a : i.pole_b;
    const idx = order.indexOf(id);
    return (
      <div className="detail">
        <p className="xs muted" style={{ margin: 0, fontWeight: 700 }}>#{idx + 1} on your list</p>
        <h2 style={{ marginBottom: 6 }}>{i.title}</h2>
        <p>{i.description}</p>
        <dl className="facts small">
          <dt>Who it affects</dt><dd>{i.what_it_affects}</dd>
          <dt>What this government can do</dt><dd>{i.who_decides}</dd>
        </dl>
        <div className="view-box">
          <h3>{i.question}</h3>
          <p className="xs muted" style={{ margin: "0 0 8px" }}>Optional. Two fair positions people hold. Tap again to clear.</p>
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
        {i.sources?.length ? (
          <p className="xs muted" style={{ marginTop: 12 }}>Why it&apos;s on the list: {i.sources.slice(0, 3).map((s, k) => <a key={k} href={s} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{host(s)}</a>)}</p>
        ) : null}
        <div className="row between" style={{ marginTop: 8 }}>
          <button className="btn ghost small" disabled={idx <= 0} onClick={() => setSelected(order[idx - 1])}>← Previous issue</button>
          <button className="btn ghost small" disabled={idx >= order.length - 1} onClick={() => setSelected(order[idx + 1])}>Next issue →</button>
        </div>
      </div>
    );
  };

  return (
    <div className="issues-layout">
      <div>
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <div>
            <h2 style={{ margin: 0 }}>Which issues matter most to you?</h2>
            <p className="muted small" style={{ margin: "4px 0 0" }}>Drag the handle, or use the arrows, to put them in order. Select an issue to read about it and add your view.</p>
          </div>
        </div>
        <div className="row between xs" style={{ margin: "10px 0 6px", minHeight: 20 }}>
          <span aria-live="polite" className="muted">{announce}</span>
          <span className={`badge ${status === "saved" ? "ok" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Not saved yet"}</span>
        </div>
        <ol className="rank-list" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {order.map((id, idx) => {
            const i = byId[id];
            if (!i) return null;
            const isSel = id === selected;
            return (
              <li key={id} ref={(el) => { refs.current[id] = el; }}
                className={`rank-item ${idx < TOP ? "top" : ""} ${isSel ? "sel" : ""} ${dragId === id ? "dragging" : ""}`}>
                <div className="rank-row">
                  <span className="grip" aria-hidden onPointerDown={(e) => onPointerDown(e, id)} title="Drag to reorder">⠿</span>
                  <span className="rank-num">{idx + 1}</span>
                  <button className="rank-title" aria-expanded={isSel} onClick={() => setSelected(id)}>
                    <span>{i.title}</span>
                    {views[id] != null && <span className="xs view-set">View added</span>}
                  </button>
                  <button className="icon-btn" aria-label={`Move ${i.title} up`} disabled={idx === 0} onClick={() => moveTo(id, idx - 1)}>↑</button>
                  <button className="icon-btn" aria-label={`Move ${i.title} down`} disabled={idx === order.length - 1} onClick={() => moveTo(id, idx + 1)}>↓</button>
                </div>
                {isSel && <div className="detail-inline"><Detail id={id} /></div>}
              </li>
            );
          })}
        </ol>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn" href={`/g/${govId}/candidates`}>See candidates</Link>
          <span className="small muted">{topDone} of {TOP} top issues have your view</span>
        </div>
        {!everSaved && <p className="xs muted" style={{ marginTop: 8 }}>Saved on this device as you go. <Link href="/signin">Sign in</Link> to make your ranking count toward your community&apos;s list.</p>}
      </div>
      <aside className="detail-aside card" aria-live="polite">
        {sel ? <Detail key={selected + selIdx} id={selected} /> : <p className="muted">Select an issue to see details.</p>}
      </aside>
    </div>
  );
}
