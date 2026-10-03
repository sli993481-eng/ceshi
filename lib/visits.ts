import type { VisitDecision } from "@/lib/constants";
import type { RequestGeo } from "@/lib/geo";
import { formatLocation } from "@/lib/geo";
import { getDb } from "@/lib/mongo";
import { parseBrowser } from "@/lib/ua";

export async function logVisit(opts: {
  geo: RequestGeo;
  ua: string;
  fingerprint: string;
  decision: VisitDecision;
  isBot: boolean;
  path: string;
}) {
  const db = await getDb();
  const parsed = parseBrowser(opts.ua);
  const doc = {
    ip: opts.geo.ip,
    country: opts.geo.country,
    region: opts.geo.region,
    city: opts.geo.city,
    location: formatLocation(opts.geo),
    ua: parsed.ua,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    fingerprint: opts.fingerprint || "",
    decision: opts.decision,
    isBot: opts.isBot,
    path: opts.path.slice(0, 300),
    createdAt: new Date(),
  };
  const result = await db.collection("visits").insertOne(doc);
  return { id: result.insertedId, ...doc };
}

export function sanitizeFingerprint(raw: unknown) {
  if (typeof raw !== "string") return "";
  const v = raw.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(v)) return "";
  return v;
}
