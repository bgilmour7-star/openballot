import { one, q } from "./db";

export type Located = {
  city: string | null;                  // id of a municipality we cover (municipalities table), or null
  cityName: string | null;              // census subdivision name from Represent
  csdId?: string | null;                // Statistics Canada census subdivision code
  riding: string | null;                // our riding id (slug of the 2023 district name)
  ridingName: string | null;
  ambiguous: boolean;                   // the postal code may cross a boundary
};

const REP = "https://represent.opennorth.ca";
const ED_SET = "british-columbia-electoral-districts-2023-redistribution";
const CSD_SET = "census-subdivisions";
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
    csdId: csd ? String(csd.external_id) : null,
    cityName: csd?.name ?? null,
    riding: ed ? slug(ed.name) : null,
    ridingName: ed?.name ?? null,
  };
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 86400 } });
  if (!res.ok) throw Object.assign(new Error(`lookup failed ${res.status}`), { status: res.status });
  return res.json();
}

/** Which covered municipality a census subdivision belongs to. Read live, so newly added municipalities apply at once. */
export async function cityForCsd(csdId: string | null | undefined, cityName?: string | null): Promise<string | null> {
  if (!csdId && !cityName) return null;
  const m = await one<{ id: string }>(
    `select id from municipalities where live and (csd_id=$1 or ($1::text is null and lower(csd_name)=lower($2))) limit 1`, [csdId ?? null, cityName ?? null]);
  return m?.id ?? null;
}

/** Fresh lookup, skipping the cache (used when adding a municipality to learn its census subdivision code). */
export async function refreshPostal(code: string): Promise<Located> {
  await q(`delete from postal_cache where postal_code=$1`, [`v2:${code}`]);
  return lookupPostal(code);
}

export async function lookupPostal(code: string): Promise<Located> {
  const cached = await one<{ result: Located }>(`select result from postal_cache where postal_code=$1`, [`v2:${code}`]);
  // Older cache rows lack the census subdivision code; look those up again.
  if (cached && (cached.result.csdId !== undefined || !cached.result.cityName))
    return { ...cached.result, city: await cityForCsd(cached.result.csdId, cached.result.cityName) };
  const data = await getJson(`${REP}/postcodes/${code}/`);
  // Postcode results don't always include the census subdivision (city), so look up the centroid point.
  let centroid = fromBoundaries(data.boundaries_centroid ?? []);
  const [lng, lat] = data.centroid?.coordinates ?? [];
  if (lat != null && lng != null && (!centroid.cityName || !centroid.riding)) {
    const b = await getJson(`${REP}/boundaries/?contains=${lat},${lng}&limit=100`);
    const pt = fromBoundaries(b.objects ?? []);
    centroid = { csdId: pt.csdId ?? centroid.csdId, cityName: pt.cityName ?? centroid.cityName, riding: pt.riding ?? centroid.riding, ridingName: pt.ridingName ?? centroid.ridingName };
  }
  const conc = (data.boundaries_concordance ?? []) as any[];
  const concCities = new Set(conc.filter((b) => setOf(b) === CSD_SET).map((b) => String(b.external_id)));
  const concEds = new Set(conc.filter((b) => setOf(b) === ED_SET).map((b) => b.name));
  const ambiguous = concCities.size > 1 || concEds.size > 1 || !centroid.riding;
  const result: Located = { ...centroid, city: await cityForCsd(centroid.csdId, centroid.cityName), ambiguous };
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
  const loc = fromBoundaries(b.objects ?? []);
  return { ...loc, city: await cityForCsd(loc.csdId, loc.cityName), ambiguous: false, matched: f.properties.fullAddress };
}
