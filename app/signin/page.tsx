import SignIn from "@/components/SignIn";
import { getGov } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/votes";
  const gov = sp.gov ? await getGov(sp.gov) : null;
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <h1>{gov ? `Make your ${gov.name} ranking count` : "Make your ranking count"}</h1>
      <p className="muted">{gov ? "Your ranking is already saved on this device. An account adds it to the community issue ranking, so it's counted alongside your neighbours', and lets you pick up on any device." : "Sign in to save your rankings and views to an account, so they count toward your community's issue list and you can pick up on any device."} We never show your name or email publicly.</p>
      <SignIn next={next} />
    </div>
  );
}
