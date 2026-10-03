import Link from "next/link";
export default function About() {
  return (
    <div className="wrap stack">
      <h1>How Openballot works</h1>
      <div className="card">
        <h2>Start with the issues</h2>
        <p>Most voting tools start with candidates and ask you to react. Openballot starts with you: what matters in your community, and where you stand. Then it shows which candidates have spoken to those issues, with a source for every statement.</p>
      </div>
      <div className="card">
        <h2>Neutral by design</h2>
        <ul className="small">
          <li>Candidates are grouped, never ranked or recommended. Order within a group is random for each visitor.</li>
          <li>Positions are short neutral summaries of public statements, each linked to where it was said.</li>
          <li>A candidate with nothing on record shows &quot;No stance yet&quot;. That never counts against them.</li>
          <li>Party or elector organization is shown only when it&apos;s official, and only as a plain label.</li>
          <li>The two positions in each question appear in random order, so neither always comes first.</li>
          <li>No ads, and no money from candidates, parties or governments.</li>
        </ul>
      </div>
      <div className="card">
        <h2>Where the information comes from</h2>
        <p className="small">Official candidate lists and guides from the City of Nanaimo, the City of Victoria and the school districts; Elections BC and reputable summaries of its candidate list; candidates&apos; own websites; and local news Q&amp;As. Gathered October 3, 2026, and updated as candidates send corrections. Each issue list has a &quot;How this list was built&quot; page.</p>
      </div>
      <div className="card">
        <h2>This is an alpha</h2>
        <p className="small">Openballot is an independent project being tested with a small group in Nanaimo and Victoria. Things may be wrong or missing. Please use <b>Send feedback</b> below, and always confirm with <a href="https://elections.bc.ca/" target="_blank" rel="noreferrer">Elections BC</a> and your municipality before you vote.</p>
        <Link className="btn" href="/">Find my votes</Link>
      </div>
    </div>
  );
}
