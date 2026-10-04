"use client";
import { useEffect, useState } from "react";
import { linkAccount } from "@/app/actions";
export default function Done() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("next") || "/votes";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/votes";
    linkAccount().then((r) => { if (r?.ok) window.location.href = next + (next.includes("?") ? "&" : "?") + "counted=1"; else setFailed(true); }).catch(() => setFailed(true));
  }, []);
  return (
    <div className="wrap">
      {failed ? <p className="notice">We couldn&apos;t finish signing you in. <a href="/signin">Try again</a>.</p> : <p className="muted">Saving your rankings to your account…</p>}
    </div>
  );
}
