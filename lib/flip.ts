/** Which side of an issue shows first for this visitor (stable per visitor, random across visitors). */
export function flipFor(seed: string, issueId: string) {
  let h = 0; for (const ch of seed + issueId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 1;
}
