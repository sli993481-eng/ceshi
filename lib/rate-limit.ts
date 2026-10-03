import { getDb } from "@/lib/mongo";
import { LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, RATE_MAX_HITS, RATE_WINDOW_MS } from "@/lib/constants";

export async function hitRateLimit(key: string, max: number, windowMs: number) {
  const db = await getDb();
  const now = Date.now();
  const resetAt = new Date(now + windowMs);
  const col = db.collection("rate_buckets");
  const existing = await col.findOne({ key });
  if (!existing || (existing.resetAt instanceof Date && existing.resetAt.getTime() < now)) {
    await col.updateOne(
      { key },
      { $set: { key, count: 1, resetAt } },
      { upsert: true },
    );
    return { limited: false, count: 1 };
  }
  const count = Number(existing.count || 0) + 1;
  await col.updateOne({ key }, { $set: { count } });
  return { limited: count > max, count };
}

export async function hitVisitRate(ip: string) {
  return hitRateLimit(`visit:${ip}`, RATE_MAX_HITS, RATE_WINDOW_MS);
}

export async function isLoginLocked(ip: string) {
  const db = await getDb();
  const existing = await db.collection("rate_buckets").findOne({ key: `login:${ip}` });
  if (!existing?.resetAt) return false;
  const resetAt = existing.resetAt instanceof Date ? existing.resetAt.getTime() : 0;
  if (resetAt < Date.now()) return false;
  return Number(existing.count || 0) >= LOGIN_MAX_FAILS;
}

export async function hitLoginFail(ip: string) {
  return hitRateLimit(`login:${ip}`, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
}
