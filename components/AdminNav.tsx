"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const ITEMS: [string, string][] = [["/admin", "Measures"], ["/admin/community", "Community"], ["/admin/locations", "Locations"], ["/admin/requests", "Requests"], ["/admin/feedback", "Feedback"], ["/admin/candidates", "Candidates"],
  ["/admin/issues", "Issues"], ["/admin/elections", "Elections"], ["/admin/affiliations", "Affiliations"], ["/admin/audit", "Change log"]];
export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Admin sections">
      {ITEMS.map(([href, label]) => {
        const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return <Link key={href} href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
