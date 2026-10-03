export default function Privacy() {
  return (
    <div className="wrap stack">
      <h1>Privacy note</h1>
      <div className="card small">
        <p><b>What we collect.</b> Your postal code; the issue rankings and views you choose to give; anonymous usage events (like &quot;ranking saved&quot;); feedback you send; and, if you sign in, your email address.</p>
        <p><b>What we don&apos;t.</b> We never store your street address. If you enter one, it&apos;s used once to find your electoral areas and then discarded. We don&apos;t use ads or third-party trackers, and we don&apos;t sell or share your data. We count page visits with Vercel Web Analytics, which uses no cookies and doesn&apos;t identify you.</p>
        <p><b>Why.</b> To show your elections, save your rankings, count signed-in rankings toward your community&apos;s issue list, and learn whether this tool is useful.</p>
        <p><b>Who sees it.</b> Only the Openballot team. Community results, when shown, are totals; no one sees your individual rankings.</p>
        <p><b>Where it&apos;s kept.</b> With our hosting providers, Vercel and Neon, which may store data outside Canada.</p>
        <p><b>Your choices.</b> You can use Openballot without an account. To have your data deleted, send feedback with &quot;delete my data&quot; and your email, and we&apos;ll remove it within 7 days.</p>
        <p className="muted">This alpha follows British Columbia&apos;s Personal Information Protection Act (PIPA). Last updated October 3, 2026.</p>
      </div>
    </div>
  );
}
