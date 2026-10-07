"use client";
import { useState } from "react";
import { logShare } from "@/app/actions";

export default function Share({ voterId }: { voterId?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://openballotbc.vercel.app/${voterId ? `?r=${voterId}` : ""}`;
  const text = "Two elections in October. This lays out every vote for your address and starts with the issues, not the candidates.";
  async function share() {
    try {
      if (navigator.share) { await navigator.share({ title: "Openballot", text, url }); logShare("native"); return; }
    } catch { return; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true); logShare("copy");
  }
  return (
    <div className="card">
      <h2>Pass it on</h2>
      <p className="muted small">Know someone in BC who&apos;s voting this month? Your link lets us see that it was shared. It never shows your rankings or any candidate.</p>
      <button className="btn secondary" onClick={share}>{copied ? "Link copied" : "Share Openballot"}</button>
    </div>
  );
}
