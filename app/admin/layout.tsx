import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin, currentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) {
    const u = await currentUser();
    if (!u) redirect("/signin");
    return <div className="wrap"><p className="notice">This page is for Openballot admins only.</p></div>;
  }
  return (
    <div className="wrap wide">
      <nav className="tabs">
        <Link href="/admin">Measures</Link><Link href="/admin/requests">Requests</Link><Link href="/admin/feedback">Feedback</Link>
        <Link href="/admin/candidates">Candidates</Link><Link href="/admin/issues">Issues</Link><Link href="/admin/elections">Elections</Link>
        <Link href="/admin/affiliations">Affiliations</Link><Link href="/admin/audit">Change log</Link>
      </nav>
      {children}
    </div>
  );
}
