import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
export function db() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}
export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db().query(text, params)) as T[];
}
export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
