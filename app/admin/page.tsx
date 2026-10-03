import { q, one } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Measures() {
  const m = (await one<any>(`select
    (select count(*) from rankings)::int as rankings,
    (select count(distinct voter_id) from rankings)::int as rankers,
    (select count(*) from views)::int as views,
    (select count(*) from voters where auth_user_id is not null)::int as signups,
    (select count(*) from claim_requests where status='approved')::int as cand_approved,
    (select count(*) from claim_requests)::int as cand_requests,
    (select count(distinct v.id) from voters v join rankings r on r.voter_id=v.id where v.referred_by is not null)::int as referrals,
    (select count(distinct voter_id) from events e join voters v on v.id=e.voter_id where v.auth_user_id is not null and e.created_at > now() - interval '7 days')::int as wau,
    (select count(*) from voters where postal_code is not null or city is not null)::int as located,
    (select count(*) from voters)::int as visitors,
    (select count(*) from feedback)::int as feedback`))!;
  const daily = await q<any>(`select to_char(date_trunc('day', created_at at time zone 'America/Vancouver'),'Mon DD') d,
    count(*) filter (where name='lookup')::int lookups, count(*) filter (where name='ranking_saved')::int rankings,
    count(*) filter (where name='view_shared')::int views, count(*) filter (where name='signup')::int signups,
    count(*) filter (where name='share')::int shares, count(*) filter (where name='referral_visit')::int ref_visits
    from events group by 1, date_trunc('day', created_at at time zone 'America/Vancouver') order by date_trunc('day', created_at at time zone 'America/Vancouver') desc limit 21`);
  const k = [
    ["Issues prioritized", m.rankings, `${m.rankers} people ranked`],
    ["Views shared", m.views, m.rankings ? `${(m.views / m.rankings).toFixed(1)} per ranking` : ""],
    ["Voter sign-ups", m.signups, `of ${m.visitors} visitors`],
    ["Candidate sign-ups", m.cand_approved, `${m.cand_requests} requests`],
    ["Referrals completed", m.referrals, "referred visitors who ranked"],
    ["Weekly active users", m.wau, "signed in, last 7 days"],
  ];
  return (
    <div>
      <h1>Alpha measures</h1>
      <p className="small muted">{m.located} visitors entered a location · {m.feedback} feedback messages. Decision rule check: {m.located ? Math.round((m.rankers / m.located) * 100) : 0}% of located visitors finished a ranking (continue at 50%+).</p>
      <div className="kpis">{k.map(([t, n, sub]) => <div className="kpi" key={t as string}><span className="xs muted">{t}</span><b>{n}</b><span className="xs muted">{sub}</span></div>)}</div>
      <h2 style={{ marginTop: 24 }}>By day</h2>
      <table className="adm"><thead><tr><th>Day</th><th>Lookups</th><th>Rankings</th><th>Views</th><th>Sign-ups</th><th>Shares</th><th>Referred visits</th></tr></thead>
        <tbody>{daily.map((r) => <tr key={r.d}><td>{r.d}</td><td>{r.lookups}</td><td>{r.rankings}</td><td>{r.views}</td><td>{r.signups}</td><td>{r.shares}</td><td>{r.ref_visits}</td></tr>)}</tbody></table>
    </div>
  );
}
