// Creates the schema and seeds content from /content on first run.
// Runs before `next build`. Safe to run repeatedly: the schema uses IF NOT EXISTS,
// and content is only seeded when the governments table is empty.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[db] DATABASE_URL not set; skipping schema and seed.");
  process.exit(0);
}
const sql = neon(url);
const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(here, "..", "content", f), "utf8"));

const schema = [
  `create table if not exists governments (
    id text primary key, name text not null, level text not null, how_built text, sort int default 0)`,
  `create table if not exists elections (
    id text primary key, government_id text not null references governments(id), name text not null,
    level text not null, voting_day date, voting_hours text, advance_voting jsonb default '[]',
    how_to_vote text, mail_ballot text, official_url text, sources jsonb default '[]', notes text)`,
  `create table if not exists races (
    id text primary key, election_id text not null references elections(id), office text not null,
    seats int not null default 1, area text, area_name text, area_note text, sort int default 0)`,
  `create table if not exists affiliations (
    id text primary key, type text not null, name text not null, website text, source_url text,
    platform_url text, platform_note text)`,
  `create table if not exists candidacies (
    id text primary key, race_id text not null references races(id), name text not null, ballot_name text,
    incumbent boolean, affiliation_id text references affiliations(id), affiliation_source text,
    declared_independent boolean default false, website text, links jsonb default '[]',
    sources jsonb default '[]', status text not null default 'active', nomination_note text,
    updated_at timestamptz default now())`,
  `create table if not exists issues (
    id text primary key, government_id text not null references governments(id), title text not null,
    description text, what_it_affects text, who_decides text, question text, pole_a text, pole_b text,
    tags jsonb default '[]', sources jsonb default '[]', sort int default 0, active boolean default true)`,
  `create table if not exists positions (
    id serial primary key, candidacy_id text not null references candidacies(id) on delete cascade,
    issue_id text references issues(id) on delete set null, topic text, summary text not null,
    source_url text, source_type text default 'candidate', lean int, updated_at timestamptz default now())`,
  `create table if not exists ballot_questions (
    id text primary key, election_id text not null references elections(id), question text not null,
    kind text, summary text, sources jsonb default '[]')`,
  `create table if not exists voters (
    id uuid primary key default gen_random_uuid(), auth_user_id text unique, email text,
    postal_code text, city text, riding text, located_by text, referred_by uuid,
    created_at timestamptz default now(), last_seen timestamptz default now())`,
  `create table if not exists rankings (
    voter_id uuid not null references voters(id) on delete cascade, government_id text not null,
    issue_ids jsonb not null, updated_at timestamptz default now(), primary key (voter_id, government_id))`,
  `create table if not exists views (
    voter_id uuid not null references voters(id) on delete cascade, issue_id text not null,
    value int not null, updated_at timestamptz default now(), primary key (voter_id, issue_id))`,
  `create table if not exists claim_requests (
    id serial primary key, candidacy_id text references candidacies(id) on delete set null,
    name text, email text, proof_url text, message text, status text default 'new',
    admin_note text, created_at timestamptz default now())`,
  `create table if not exists feedback (
    id serial primary key, voter_id uuid, page text, message text not null, email text,
    created_at timestamptz default now())`,
  `create table if not exists events (
    id bigserial primary key, voter_id uuid, name text not null, data jsonb default '{}',
    created_at timestamptz default now())`,
  `create index if not exists events_name_idx on events(name, created_at)`,
  `create table if not exists postal_cache (
    postal_code text primary key, result jsonb not null, created_at timestamptz default now())`,
  `create table if not exists audit_log (
    id bigserial primary key, actor text, entity text, entity_id text, action text,
    before jsonb, after jsonb, created_at timestamptz default now())`,
];

for (const s of schema) await sql.query(s);
await sql.query(`alter table issues add column if not exists tradeoffs jsonb`);
await sql.query(`alter table candidacies add column if not exists summary text`);
await sql.query(`alter table candidacies add column if not exists summary_source text`);
await sql.query(`alter table affiliations add column if not exists blurb text`);
await sql.query(`alter table affiliations add column if not exists blurb_source text`);
await sql.query(`alter table affiliations add column if not exists leader text`);
await sql.query(`alter table affiliations add column if not exists leader_riding text`);
await sql.query(`alter table affiliations add column if not exists candidate_count int`);
await sql.query(`alter table affiliations add column if not exists positions_note text`);
await sql.query(`alter table voters add column if not exists exclude_from_results boolean default false`);
await sql.query(`create table if not exists affiliation_positions (
  id serial primary key, affiliation_id text not null references affiliations(id) on delete cascade,
  issue_id text references issues(id) on delete set null, summary text not null, source_url text,
  source_type text default 'party_policy_page', lean int, updated_at timestamptz default now())`);
console.log("[db] schema ok");



// Keep provincial parties and candidates in step with the research file (safe to repeat).
async function syncProvincial() {
  let p; try { p = read("bc-provincial-2026.json"); } catch { return; }
  const ops = [];
  for (const x of p.parties ?? [])
    ops.push(sql.query(`insert into affiliations (id,type,name,website,source_url,platform_url,platform_note,leader,leader_riding,candidate_count)
      values ($1,'party',$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (id) do update set name=excluded.name, website=coalesce(excluded.website, affiliations.website), platform_url=coalesce(excluded.platform_url, affiliations.platform_url),
        platform_note=coalesce(excluded.platform_note, affiliations.platform_note), leader=excluded.leader, leader_riding=excluded.leader_riding, candidate_count=excluded.candidate_count`,
      [x.id, x.shortName || x.name, x.website || null, (x.sourceUrls ?? [])[0] ?? x.website ?? null, x.platformUrl || null, x.platformNote ?? null, x.leader ?? null, x.leaderRiding ?? null, x.candidateCount ?? null]));
  for (const rd of p.ridings ?? []) for (const r of rd.races ?? []) for (const c of r.candidates ?? []) {
    const status = /reported|announced|not yet/i.test(c.nominationStatus ?? "") ? "unconfirmed" : "active";
    ops.push(sql.query(`insert into candidacies (id,race_id,name,ballot_name,incumbent,affiliation_id,affiliation_source,declared_independent,website,links,sources,status,nomination_note)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      on conflict (id) do update set status=excluded.status, affiliation_id=excluded.affiliation_id, nomination_note=excluded.nomination_note,
        ballot_name=coalesce(excluded.ballot_name, candidacies.ballot_name), website=coalesce(candidacies.website, excluded.website)`,
      [`${r.id}--${c.id}`, r.id, c.name, c.ballotName || null, c.incumbent ?? null, c.affiliation?.partyId ?? null, c.affiliation?.sourceUrl ?? null,
       !!c.declaredIndependent, c.website || null, JSON.stringify((c.links ?? []).filter((l) => l.url)), JSON.stringify(c.sourceUrls ?? []), status, c.nominationNote ?? c.nominationStatus ?? null]));
  }
  for (const rm of p.removed ?? []) if (rm.raceId && rm.id) ops.push(sql.query(`update candidacies set status='withdrawn' where id=$1`, [`${rm.raceId}--${rm.id}`]));
  if (ops.length) { await sql.transaction(ops); console.log(`[db] provincial synced (${ops.length})`); }
}


// Party positions come from the research file and are replaced on each build (file is the source of truth).
async function syncPartyPositions() {
  let f; try { f = read("party-positions-2026.json"); } catch { return; }
  const ops = [];
  for (const [aid, v] of Object.entries(f.parties ?? {})) {
    ops.push(sql.query(`update affiliations set positions_note=$2 where id=$1`, [aid, v.statusNote ?? null]));
    ops.push(sql.query(`delete from affiliation_positions where affiliation_id=$1`, [aid]));
    for (const p of v.positions ?? [])
      ops.push(sql.query(`insert into affiliation_positions (affiliation_id, issue_id, summary, source_url, source_type, lean)
        select $1, $2, $3, $4, $5, $6 where exists (select 1 from affiliations where id=$1)`,
        [aid, p.issueId, p.summary, p.sourceUrl ?? null, p.sourceType ?? "party_policy_page", p.lean ?? null]));
  }
  if (ops.length) { await sql.transaction(ops); console.log(`[db] party positions synced (${ops.length})`); }
}

async function backfillBios() {
  const ups = [];
  for (const f of ["bios-nanaimo.json", "bios-victoria.json", "bios-provincial.json"]) {
    let b; try { b = read(f); } catch { continue; }
    for (const [id, v] of Object.entries(b.candidates ?? {}))
      if (v?.summary) ups.push(sql.query(`update candidacies set summary=$2, summary_source=$3 where id=$1 and summary is null`, [id, v.summary, v.sourceUrl ?? null]));
    for (const [id, v] of Object.entries(b.affiliations ?? {}))
      if (v?.blurb) ups.push(sql.query(`update affiliations set blurb=$2, blurb_source=$3 where id=$1 and blurb is null`, [id, v.blurb, v.sourceUrl ?? null]));
  }
  if (ups.length) { await sql.transaction(ups); console.log(`[db] bios backfilled (${ups.length})`); }
}

// Backfill content added after first seed (safe to repeat: only fills empty rows).
try {
  const t = read("tradeoffs-2026.json");
  const ups = Object.entries(t.issues ?? {}).map(([id, v]) =>
    sql.query(`update issues set tradeoffs=$2 where id=$1 and tradeoffs is null`, [id, JSON.stringify(v)]));
  const [{ n: have }] = await sql`select count(*)::int as n from governments`;
  if (have > 0) { if (ups.length) { await sql.transaction(ups); console.log(`[db] trade-offs backfilled (${ups.length})`); } await syncProvincial(); await syncPartyPositions(); await backfillBios(); }
} catch (e) { console.log("[db] no trade-offs file yet", String(e).slice(0, 80)); }

const [{ n }] = await sql`select count(*)::int as n from governments`;
if (n > 0) {
  console.log(`[db] content already seeded (${n} governments); skipping seed.`);
  process.exit(0);
}

// ---------- seed ----------
const nanaimo = read("nanaimo-2026.json");
const victoria = read("victoria-2026.json");
const prov = read("bc-provincial-2026.json");
const issuesFile = read("issues-2026.json");

const q = [];
const add = (text, params) => q.push(sql.query(text, params));

const govs = [
  ["city-of-nanaimo", "City of Nanaimo", "municipal", 1],
  ["sd68", "School District 68 (Nanaimo-Ladysmith)", "school", 2],
  ["city-of-victoria", "City of Victoria", "municipal", 1],
  ["sd61", "School District 61 (Greater Victoria)", "school", 2],
  ["province-of-bc", "Province of British Columbia", "provincial", 3],
];
const howBuilt = Object.fromEntries(issuesFile.governments.map((g) => [g.id, g.howBuilt]));
for (const [id, name, level, sort] of govs)
  add(`insert into governments (id,name,level,how_built,sort) values ($1,$2,$3,$4,$5)`, [id, name, level, howBuilt[id] ?? null, sort]);

// affiliations
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const affIds = new Map();
for (const eo of [...(nanaimo.electorOrganizations ?? []), ...(victoria.electorOrganizations ?? [])]) {
  const id = slug(eo.name);
  affIds.set(eo.name.toLowerCase(), id);
  add(`insert into affiliations (id,type,name,website,source_url,platform_url) values ($1,'elector_organization',$2,$3,$4,$5)`,
    [id, eo.name, eo.website ?? null, eo.sourceUrl ?? null, eo.platformUrl ?? null]);
}
for (const p of prov.parties ?? []) {
  affIds.set(p.name.toLowerCase(), p.id);
  add(`insert into affiliations (id,type,name,website,source_url,platform_url,platform_note) values ($1,'party',$2,$3,$4,$5,$6)`,
    [p.id, p.name, p.website ?? null, p.website ?? null, p.platformUrl || null, p.platformNote ?? null]);
}

// issues
const issueRows = [];
for (const g of issuesFile.governments) {
  g.issues.forEach((i, idx) => {
    const id = `${g.id}--${i.id}`;
    issueRows.push({ id, gov: g.id, title: i.title.toLowerCase(), tags: i.topicTags ?? [] });
    add(`insert into issues (id,government_id,title,description,what_it_affects,who_decides,question,pole_a,pole_b,tags,sources,sort)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, g.id, i.title, i.description, i.whatItAffects, i.whoDecides, i.viewQuestion?.question, i.viewQuestion?.poleA,
       i.viewQuestion?.poleB, JSON.stringify(i.topicTags ?? []), JSON.stringify(i.sources ?? []), idx]);
  });
}

// position topic -> issue keywords (matched against issue titles in the same government)
const topicKeywords = {
  housing: ["housing"], planning: ["housing", "permit"], affordability: ["cost of living", "housing"],
  "public safety": ["safety", "crime"], "taxes/budget": ["tax", "budget", "spending", "deficit"],
  budget: ["budget", "tax", "spending"], funding: ["budget", "funding", "spending"],
  governance: ["governance"], "environment/climate": ["climate", "environment", "trees"],
  homelessness: ["homeless", "shelter"], downtown: ["downtown"], economy: ["economy", "jobs", "downtown"],
  "health care": ["health"], transportation: ["getting around", "streets", "transport"],
  infrastructure: ["roads", "infrastructure", "water"], "city services": ["roads", "water"],
  "parks/recreation": ["recreation", "parks"], "arts/culture": ["recreation"],
  reconciliation: ["indigenous", "lekwungen"], "school facilities": ["building", "space"],
  facilities: ["building", "space"], schools: ["building", "space"],
  "student supports": ["diverse learners"], inclusion: ["diverse learners"], equity: ["diverse learners"],
  accessibility: ["diverse learners"], staffing: ["budget"], "student achievement": ["reading"],
  "student wellbeing": ["well-being"], "cell phones": ["well-being"], youth: ["well-being"],
  childcare: ["care", "early learning"], "child care": ["care", "early learning"],
};
const issueFor = (gov, topic) => {
  const kws = topicKeywords[(topic ?? "").toLowerCase()] ?? [];
  for (const kw of kws) {
    const hit = issueRows.find((r) => r.gov === gov && r.title.includes(kw));
    if (hit) return hit.id;
  }
  return null;
};
const sourceType = (url, cand) => {
  if (!url) return "other";
  if (/realnanaimo|victoriaforall/.test(url)) return "affiliation_platform";
  if (cand.website && url.startsWith(cand.website.replace(/\/$/, ""))) return "candidate";
  if (/victoria\.ca|nanaimo\.ca|sd6[18]\.bc\.ca/.test(url)) return "official_guide";
  if (/news|sounder|bulletin|cbc|ctv|times|chek|capital/.test(url)) return "news";
  return "candidate";
};

function seedElection(e, govId, races, extra = {}) {
  add(`insert into elections (id,government_id,name,level,voting_day,voting_hours,advance_voting,how_to_vote,mail_ballot,official_url,sources)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [e.id, govId, e.name, e.level, e.votingDay ?? null, extra.votingHours ?? e.votingDayHours ?? null,
     JSON.stringify(e.advanceVoting ?? []), e.howToVote ?? null, extra.mail ?? e.voteByMail ?? null,
     e.officialUrl ?? null, JSON.stringify(e.sources ?? [])]);
  for (const bq of e.ballotQuestions ?? [])
    add(`insert into ballot_questions (id,election_id,question,kind,summary,sources) values ($1,$2,$3,$4,$5,$6)`,
      [bq.id, e.id, bq.question, bq.type ?? null, bq.summary ?? null, JSON.stringify(bq.sourceUrls ?? [])]);
}
function seedRaces(electionId, govId, races, area, areaName, areaNote) {
  races.forEach((r, ri) => {
    add(`insert into races (id,election_id,office,seats,area,area_name,area_note,sort) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r.id, electionId, r.office, r.seats ?? 1, area, areaName, areaNote ?? null, ri]);
    for (const c of r.candidates) {
      const cid = `${r.id}--${c.id}`;
      const aff = c.affiliation?.name ? affIds.get(c.affiliation.name.toLowerCase()) ?? null : null;
      add(`insert into candidacies (id,race_id,name,ballot_name,incumbent,affiliation_id,affiliation_source,declared_independent,website,links,sources,status,nomination_note)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [cid, r.id, c.name, c.ballotName || null, c.incumbent ?? null, aff, c.affiliation?.sourceUrl ?? null,
         !!c.declaredIndependent, c.website || null, JSON.stringify((c.links ?? []).filter((l) => l.url)),
         JSON.stringify(c.sourceUrls ?? []), (c.withdrawn || /withdr/i.test(c.status ?? "")) ? "withdrawn" : /announced|not yet|reported/i.test(c.nominationStatus ?? "") ? "unconfirmed" : "active", c.nominationStatus ?? null]);
      for (const p of c.positions ?? []) {
        add(`insert into positions (candidacy_id,issue_id,topic,summary,source_url,source_type) values ($1,$2,$3,$4,$5,$6)`,
          [cid, issueFor(govId, p.topic), p.topic ?? null, p.summary, p.sourceUrl ?? null,
           p.sourceType ?? sourceType(p.sourceUrl, c)]);
      }
    }
  });
}

const [nLocal, nSd] = nanaimo.elections;
seedElection(nLocal, "city-of-nanaimo");
seedRaces(nLocal.id, "city-of-nanaimo", nLocal.races, "nanaimo", "City of Nanaimo");
seedElection(nSd, "sd68");
seedRaces(nSd.id, "sd68", nSd.races, "nanaimo", "All of School District 68", nSd.appliesTo);
const [vLocal, vSd] = victoria.elections;
seedElection(vLocal, "city-of-victoria");
seedRaces(vLocal.id, "city-of-victoria", vLocal.races, "victoria", "City of Victoria");
seedElection(vSd, "sd61");
seedRaces(vSd.id, "sd61", vSd.races, "victoria", "Trustee area 5 (Victoria)", vSd.appliesTo);
seedElection(prov.election, "province-of-bc", null, { mail: prov.election.voteByMail });
for (const rd of prov.ridings)
  seedRaces(prov.election.id, "province-of-bc", rd.races, rd.id, rd.name, rd.coverageNote);
// party platform commitments become affiliation-sourced positions later, via admin

// One transaction, in order, so foreign keys are satisfied and a failed seed leaves nothing behind.
await sql.transaction(q);
console.log(`[db] seeded ${q.length} rows`);
try {
  const t = read("tradeoffs-2026.json");
  await sql.transaction(Object.entries(t.issues ?? {}).map(([id, v]) => sql.query(`update issues set tradeoffs=$2 where id=$1 and tradeoffs is null`, [id, JSON.stringify(v)])));
  console.log("[db] trade-offs added");
} catch {}
await syncProvincial();
await syncPartyPositions();
await backfillBios();
