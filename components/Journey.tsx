import Link from "next/link";

/** The voter's progress for one government: rank → views → make it count. Not a banner; it's the next step. */
export default function Journey({ govId, govName, ranked, viewsDone, viewsTotal = 3, signedIn, next }: {
  govId: string; govName: string; ranked: boolean; viewsDone: number; viewsTotal?: number; signedIn: boolean; next: string;
}) {
  const s1 = ranked, s2 = viewsDone >= viewsTotal, s3 = signedIn && ranked;
  return (
    <section className="journey" aria-label="Your progress">
      <ol className="jsteps">
        <li className={s1 ? "done" : "now"}>
          <span className="jdot" aria-hidden>{s1 ? "✓" : "1"}</span>
          <span><b>Rank the issues</b><span className="jsub">{s1 ? "Saved" : "Drag them into your order"}</span></span>
        </li>
        <li className={s2 ? "done" : s1 ? "now" : ""}>
          <span className="jdot" aria-hidden>{s2 ? "✓" : "2"}</span>
          <span><b>Add your views</b><span className="jsub">{Math.min(viewsDone, viewsTotal)} of {viewsTotal} top issues</span></span>
        </li>
        <li className={s3 ? "done" : s1 ? "now" : ""}>
          <span className="jdot" aria-hidden>{s3 ? "✓" : "3"}</span>
          <span><b>{s3 ? "Counting" : "Make it count"}</b><span className="jsub">{s3 ? `In ${govName}'s community issue ranking` : signedIn ? "Rank to be counted" : "Add your ranking to the community"}</span></span>
        </li>
      </ol>
      {ranked && !signedIn && (
        <div className="jnext">
          <p className="small" style={{ margin: 0 }}><span className="jlong">Your ranking is saved on this device, but it isn&apos;t in {govName}&apos;s community issue ranking yet. A free account adds it, keeps it on any device, and only takes a minute. We never show your name or email.</span><span className="jshort">Saved on this device, not yet counted in {govName}&apos;s community issue ranking. A free account adds it.</span></p>
          <Link className="btn" href={`/signin?next=${encodeURIComponent(next)}&gov=${encodeURIComponent(govId)}`}>Make my ranking count</Link>
        </div>
      )}
    </section>
  );
}
