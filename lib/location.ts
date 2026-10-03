import { one, q } from "./db";

export type Located = {
  city: "nanaimo" | "victoria" | null;   // legal municipality we cover, or null
  cityName: string | null;              // census subdivision name from Represent
  riding: string | null;                // our riding id (slug of the 2023 district name)
  ridingName: string | null;
  ambiguous: boolean;                   // the postal code may cross a boundary
};

const REP = "https://represent.opennorth.ca";
const ED_SET = "british-columbia-electoral-districts-2023-redistribution";
const CSD_SET = "census-subdivisions";
const CITY_BY_CSD: Record<string, "nanaimo" | "victoria"> = { "5921007": "nanaimo", "5917034": "victoria" };
export const COVERED_RIDINGS = [
  "nanaimo-gabriola-island", "nanaimo-lantzville", "victoria-beacon-hill", "victoria-swan-lake", "esquimalt-colwood",
];

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const setOf = (b: any): string => (b?.related?.boundary_set_url ?? "").split("/").filter(Boolean).pop() ?? "";

export function normalizePostal(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(s) ? s : null;
}

function fromBoundaries(list: any[]) {
  const csd = list.find((b) => setOf(b) === CSD_SET);
  const ed = list.find((b) => setOf(b) === ED_SET);
  return {
    city: csd ? CITY_BY_CSD[String(csd.external_id)] ?? null : null,
    cityName: csd?.name ?? null,
    riding: ed ? slug(ed.name) : null,
    ridingName: ed?.name ?? null,
  };
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`lookup failed ${res.status}`);
  return res.json();
}

export async function lookupPostal(code: string): Promise<Located> {
  const cached = await one<{ result: Located }>(`select result from postal_cache where postal_code=$1`, [`v2:${code}`]);
  if (cached) return cached.result;
  const data = await getJson(`${REP}/postcodes/${code}/`);
  // Postcode results don't always include the census subdivision (city), so look up the centroid point.
  let centroid = fromBoundaries(data.boundaries_centroid ?? []);
  const [lng, lat] = data.centroid?.coordinates ?? [];
  if (lat != null && lng != null && (!centroid.cityName || !centroid.riding)) {
    const b = await getJson(`${REP}/boundaries/?contains=${lat},${lng}&limit=100`);
    const pt = fromBoundaries(b.objects ?? []);
    centroid = { city: pt.city ?? centroid.city, cityName: pt.cityName ?? centroid.cityName, riding: pt.riding ?? centroid.riding, ridingName: pt.ridingName ?? centroid.ridingName };
  }
  const conc = (data.boundaries_concordance ?? []) as any[];
  const concCities = new Set(conc.filter((b) => setOf(b) === CSD_SET).map((b) => String(b.external_id)));
  const concEds = new Set(conc.filter((b) => setOf(b) === ED_SET).map((b) => b.name));
  const ambiguous = concCities.size > 1 || concEds.size > 1 || !centroid.riding;
  const result: Located = { ...centroid, ambiguous };
  await q(`insert into postal_cache (postal_code, result) values ($1,$2) on conflict (postal_code) do update set result=excluded.result`,
    [`v2:${code}`, JSON.stringify(result)]);
  return result;
}

export async function lookupAddress(address: string): Promise<(Located & { matched: string }) | null> {
  const g = await getJson(
    `https://geocoder.api.gov.bc.ca/addresses.json?addressString=${encodeURIComponent(address)}&maxResults=1&outputSRS=4326&minScore=70`,
  );
  const f = g.features?.[0];
  const precision = f?.properties?.matchPrecision;
  if (!f || !["CIVIC_NUMBER", "BLOCK"].includes(precision)) return null;
  const [lng, lat] = f.geometry.coordinates;
  const b = await getJson(`${REP}/boundaries/?contains=${lat},${lng}&limit=100`);
  return { ...fromBoundaries(b.objects ?? []), ambiguous: false, matched: f.properties.fullAddress };
}
