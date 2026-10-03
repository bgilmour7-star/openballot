import SignIn from "@/components/SignIn";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <h1>Make your ranking count</h1>
      <p className="muted">Sign in to save your rankings and views to an account, so they count toward your community&apos;s issue list and you can pick up on any device. We never show your name or email publicly.</p>
      <SignIn />
    </div>
  );
}
