import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate, getIssues } from "@/lib/data";
import { one } from "@/lib/db";
import { submitClaim } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Claim({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const id = decodeURIComponent((await params).id);
  const sp = await searchParams;
  const c = await getCandidate(id);
  if (!c) notFound();
  const problem = !!sp.problem;
  const race = await one<{ government_id: string }>(`select e.government_id from races r join elections e on e.id=r.election_id where r.id=$1`, [c.race_id]);
  const issues = race ? await getIssues(race.government_id) : [];
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
        {!problem && issues.length > 0 && (
          <fieldset className="claim-sides">
            <legend><b>Where do you stand?</b> <span className="hint">Optional. Voters answer the same questions. Your answers replace Openballot&apos;s reading once your claim is verified.</span></legend>
            {issues.map((i) => (
              <div key={i.id} className="claim-q">
                <p className="small" style={{ margin: "0 0 4px" }}><b>{i.question}</b></p>
                <div className="claim-opts">
                  {[["-2", `Strongly A: ${i.pole_a}`], ["-1", `Lean A`], ["0", "Both equally / unsure"], ["1", "Lean B"], ["2", `Strongly B: ${i.pole_b}`]].map(([val, lab]) => (
                    <label key={val}><input type="radio" name={`side__${i.id}`} value={val} /> {lab}</label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        )}
        <button className="btn">Send for review</button>
      </form>
    </div>
  );
}
