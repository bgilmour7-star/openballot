/** Neutral initials avatar: the same treatment for every candidate. */
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return <span className="avatar" aria-hidden style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}
