"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { submitFeedback } from "@/app/actions";
import { Suspense } from "react";

function Inner() {
  const path = usePathname();
  const sp = useSearchParams();
  if (sp.get("thanks")) return <span className="badge ok">Thanks, feedback sent</span>;
  return (
    <details className="fb">
      <summary>Send feedback</summary>
      <form action={submitFeedback} className="card" style={{ marginTop: 8, maxWidth: 480 }}>
        <input type="hidden" name="page" value={path} />
        <div className="field">
          <label htmlFor="fb-msg">What&apos;s confusing, missing or wrong?</label>
          <textarea id="fb-msg" name="message" required />
        </div>
        <div className="field">
          <label htmlFor="fb-email">Email <span className="hint">(optional, if you&apos;d like a reply)</span></label>
          <input id="fb-email" name="email" type="email" />
        </div>
        <button className="btn small">Send</button>
      </form>
    </details>
  );
}
export default function Feedback() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
