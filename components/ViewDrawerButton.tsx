"use client";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Issue } from "@/lib/data";
import IssueDetail from "./IssueDetail";
import { saveView } from "@/app/actions";

/** Opens the issue drawer in place (right on desktop, bottom sheet on phones) so a voter can add or change their view without leaving the page. */
export default function ViewDrawerButton({ issue, rank, flip, value: initial, label, className }: {
  issue: Issue; rank: number; flip: boolean; value: number | undefined; label: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | undefined>(initial);
  const [, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    document.getElementById("vd-close")?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() { setOpen(false); router.refresh(); }
  function pick(canonical: number) {
    const next = value === canonical ? undefined : canonical;
    setValue(next);
    start(async () => { await saveView(issue.id, next ?? null); });
  }

  return (
    <>
      <button type="button" className={className ?? "linklike"} onClick={() => setOpen(true)} aria-haspopup="dialog">{label}</button>
      {open && createPortal(
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={issue.title}>
          <button className="sheet-backdrop" aria-label="Close" onClick={close} />
          <div className="sheet">
            <div className="sheet-head">
              <span className="sheet-grab" aria-hidden />
              <div className="row between" style={{ width: "100%" }}>
                <span className="small muted">{value != null ? "✓ Your view is saved" : "Choose the option closer to your view"}</span>
                <button id="vd-close" className="btn ghost small" onClick={close}>Done</button>
              </div>
            </div>
            <div className="sheet-body"><IssueDetail issue={issue} rank={rank} flip={flip} value={value} onPick={pick} /></div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
