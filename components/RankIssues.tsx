"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveRanking, saveView } from "@/app/actions";
import type { Issue } from "@/lib/data";
import IssueDetail from "./IssueDetail";
import Journey from "./Journey";

const TOP = 3;

export default function RankIssues({ govId, issues, initialOrder, initialViews, saved, flip, community, signedIn, govName }: {
  govId: string; issues: Issue[]; initialOrder: string[]; initialViews: Record<string, number>; saved: boolean; flip: Record<string, boolean>;
  community?: Record<string, number>; signedIn: boolean; govName: string;
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

  // Drag on the grip handle. Listeners live on window so the drag survives React moving the row
  // (iOS drops pointer capture when a captured element moves in the DOM).
  const dragRef = useRef<string | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  useEffect(() => {
    if (!dragId) return;
    const move = (y: number) => {
      const id = dragRef.current; if (!id) return;
      const ids = orderRef.current;
      for (let k = 0; k < ids.length; k++) {
        const el = refs.current[ids[k]];
        if (!el || ids[k] === id) continue;
        const r = el.getBoundingClientRect();
        if (y > r.top && y < r.bottom) {
          const from = ids.indexOf(id), mid = r.top + r.height / 2;
          if ((from < k && y > mid) || (from > k && y < mid)) moveTo(id, k, false);
          break;
        }
      }
      // Auto-scroll near the screen edges.
      if (y < 60) window.scrollBy(0, -12); else if (y > window.innerHeight - 60) window.scrollBy(0, 12);
    };
    const onPM = (e: PointerEvent) => { e.preventDefault(); move(e.clientY); };
    const onTM = (e: TouchEvent) => { e.preventDefault(); if (e.touches[0]) move(e.touches[0].clientY); };
    const end = () => {
      const id = dragRef.current;
      if (id) setAnnounce(`${byId[id].title} is now number ${orderRef.current.indexOf(id) + 1}`);
      dragRef.current = null; setDragId(null);
    };
    window.addEventListener("pointermove", onPM, { passive: false });
    window.addEventListener("touchmove", onTM, { passive: false });
    window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end); window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("pointermove", onPM); window.removeEventListener("touchmove", onTM);
      window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); window.removeEventListener("touchend", end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);
  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    dragRef.current = id; setDragId(id);
  }

  // Phone: details open in a bottom sheet so the list stays in view behind it.
  const [sheet, setSheet] = useState(false);
  function openIssue(id: string) {
    setSelected(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches) setSheet(true);
  }
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(false); };
    window.addEventListener("keydown", esc);
    document.getElementById("sheet-close")?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [sheet]);

  function pick(issueId: string, canonical: number) {
    const value = views[issueId] === canonical ? null : canonical;
    setViews((v) => { const n = { ...v }; if (value === null) delete n[issueId]; else n[issueId] = value; return n; });
    start(async () => { await saveView(issueId, value); });
  }

  const topDone = order.slice(0, TOP).filter((id) => views[id] != null).length;
  const sel = byId[selected];
  const selIdx = order.indexOf(selected);

  const Detail = ({ id }: { id: string }) => {
    const idx = order.indexOf(id);
    return (
      <IssueDetail issue={byId[id]} rank={idx + 1} flip={flip[id]} value={views[id]} onPick={(c) => pick(id, c)}
        onPrev={idx > 0 ? () => setSelected(order[idx - 1]) : undefined}
        onNext={idx < order.length - 1 ? () => setSelected(order[idx + 1]) : undefined} />
    );
  };

  return (
    <div className="issues-layout">
      <div>
        <Journey govId={govId} govName={govName} ranked={everSaved} viewsDone={topDone} signedIn={signedIn} next={`/g/${govId}/community`} />
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <div>
            <h2 style={{ margin: 0 }}>Which issues matter most to you?</h2>
            <p className="muted small" style={{ margin: "4px 0 0" }}>Drag ⠿ to put them in your order. Tap an issue to read about it and add your view.</p>
          </div>
        </div>
        <div className="row between xs" style={{ margin: "10px 0 6px", minHeight: 20 }}>
          <span aria-live="polite" className="muted">{announce}</span>
          <span className={`badge ${status === "saved" ? "ok" : ""}`}>{status === "saving" ? "Saving…" : status === "saved" ? (signedIn ? "✓ Saved to your account" : "✓ Saved on this device") : "Move an issue to save your order"}</span>
        </div>
        <ol className="rank-list">
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
                  <button className="rank-title" aria-current={isSel ? "true" : undefined} onClick={() => openIssue(id)}>
                    <span>{i.title}</span>
                    {views[id] != null
                      ? <span className="xs view-state done"><span className="vi" aria-hidden>✓</span>View added</span>
                      : <span className="xs view-state todo"><span className="vi" aria-hidden>+</span>Add your view</span>}
                    {community?.[id] && <span className="comm-badge">#{community[id]} in your community</span>}
                  </button>
                  <button className="icon-btn arrow" aria-label={`Move ${i.title} up`} disabled={idx === 0} onClick={() => moveTo(id, idx - 1)}>↑</button>
                  <button className="icon-btn arrow" aria-label={`Move ${i.title} down`} disabled={idx === order.length - 1} onClick={() => moveTo(id, idx + 1)}>↓</button>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn" href={`/g/${govId}/candidates`}>See candidates</Link>
          {everSaved && <Link className="btn secondary" href={`/g/${govId}/community`}>What your neighbours think</Link>}
          <span className={`small ${topDone < TOP ? "nudge" : "muted"}`}>{topDone < TOP ? `Add your view on ${TOP - topDone} more of your top ${TOP}` : `✓ Views added on your top ${TOP}`}</span>
        </div>
      </div>
      <aside className="detail-aside card" aria-live="polite">
        {sel ? <Detail key={selected + selIdx} id={selected} /> : <p className="muted">Select an issue to see details.</p>}
      </aside>
      {sheet && sel && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={sel.title}>
          <button className="sheet-backdrop" aria-label="Close" onClick={() => setSheet(false)} />
          <div className="sheet">
            <div className="sheet-head">
              <span className="sheet-grab" aria-hidden />
              <div className="row between" style={{ width: "100%" }}>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn secondary small" disabled={selIdx === 0} onClick={() => moveTo(selected, selIdx - 1)} aria-label="Move this issue up">↑ Up</button>
                  <button className="btn secondary small" disabled={selIdx === order.length - 1} onClick={() => moveTo(selected, selIdx + 1)} aria-label="Move this issue down">↓ Down</button>
                  <button className="btn ghost small" disabled={selIdx === 0} onClick={() => moveTo(selected, 0)}>To top</button>
                </div>
                <button id="sheet-close" className="btn ghost small" onClick={() => setSheet(false)}>Done</button>
              </div>
            </div>
            <div className="sheet-body"><Detail key={selected + selIdx} id={selected} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
