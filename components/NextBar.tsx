import Link from "next/link";
import type { ReactNode } from "react";

type L = { href: string; label: string };

/**
 * The app's sticky next-step bar. Sits at the end of a page's content and sticks to the
 * bottom of the screen while you scroll, then settles above the site footer.
 * One primary action, optional quiet links, and a short status on the left.
 */
export default function NextBar({ status, links = [], primary }: { status?: ReactNode; links?: L[]; primary: L }) {
  return (
    <div className="next-bar" role="region" aria-label="Next step">
      <div className="nb-status">{status}</div>
      <div className="nb-actions">
        {links.map((l) => <Link key={l.href + l.label} className="nb-link" href={l.href}>{l.label}</Link>)}
        <Link className="btn nb-primary" href={primary.href}>{primary.label}</Link>
      </div>
    </div>
  );
}

/** Small segmented progress, e.g. views added on your top 3. */
export function NbProgress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <span className="nb-progress">
      <span className="nb-segs" aria-hidden>{Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? "on" : ""} />)}</span>
      <span className="nb-plabel">{label}</span>
    </span>
  );
}
