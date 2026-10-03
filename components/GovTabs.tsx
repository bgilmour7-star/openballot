import Link from "next/link";
export default function GovTabs({ gov, on }: { gov: string; on: "issues" | "candidates" | "how" }) {
  return (
    <nav className="tabs" aria-label="Sections">
      <Link className={on === "issues" ? "on" : ""} href={`/g/${gov}`}>1. Issues</Link>
      <Link className={on === "candidates" ? "on" : ""} href={`/g/${gov}/candidates`}>2. Candidates</Link>
      <Link className={on === "how" ? "on" : ""} href={`/g/${gov}/how-built`}>How this list was built</Link>
    </nav>
  );
}
