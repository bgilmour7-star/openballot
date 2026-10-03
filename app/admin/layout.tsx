import AdminNav from "@/components/AdminNav";
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
      <AdminNav />
      {children}
    </div>
  );
}
