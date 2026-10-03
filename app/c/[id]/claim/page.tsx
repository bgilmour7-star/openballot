import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate } from "@/lib/data";
import { submitClaim } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Claim({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const id = decodeURIComponent((await params).id);
  const sp = await searchParams;
  const c = await getCandidate(id);
  if (!c) notFound();
  const problem = !!sp.problem;
  return (
    <div className="wrap">
      <p className="small" style={{ margin: 0 }}><Link href={`/c/${encodeURIComponent(id)}`}>← {c.name}</Link></p>
      <h1>{problem ? `Report a problem with ${c.name}'s profile` : `Are you ${c.name}?`}</h1>
      <p className="muted">{problem ? "Tell us what's wrong and, if you can, where the right information is published." : "Send a request to claim this profile. We check it against the official candidate list and contact you through your campaign email before anything changes."}</p>
      {sp.err && <p className="notice">Please add a name and a valid email.</p>}
      <form action={submitClaim} className="card">
        <input type="hidden" name="candidacy_id" value={id} />
        <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" type="text" required /></div>
        <div className="field"><label htmlFor="email">{problem ? "Your email" : "Campaign email"}</label><input id="email" name="email" type="email" required /></div>
        {!problem && <div className="field"><label htmlFor="proof">Link that shows this is you <span className="hint">e.g. your campaign site listing this email</span></label><input id="proof" name="proof_url" type="url" /></div>}
        <div className="field"><label htmlFor="message">{problem ? "What's wrong?" : "Corrections or positions, with sources"}</label><textarea id="message" name="message" defaultValue={problem ? "[Problem report] " : ""} /></div>
        <button className="btn">Send for review</button>
      </form>
    </div>
  );
}
