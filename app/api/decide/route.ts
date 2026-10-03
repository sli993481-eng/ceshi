import { NextResponse } from "next/server";
import { evaluateAccess, redirectFor } from "@/lib/access";
import { AIRBNB_URL } from "@/lib/constants";
import { isObviousBot } from "@/lib/bots";
import { readRequestGeo } from "@/lib/geo";
import { hasMongoUri } from "@/lib/mongo";
import { hitVisitRate } from "@/lib/rate-limit";
import { logVisit, sanitizeFingerprint } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const geo = readRequestGeo(request);
  const ua = request.headers.get("user-agent") || "";
  let fingerprint = "";
  try {
    const body = (await request.json()) as { fingerprint?: string };
    fingerprint = sanitizeFingerprint(body.fingerprint);
  } catch {
    fingerprint = "";
  }

  const bot = isObviousBot(ua);

  try {
    if (!hasMongoUri()) {
      return NextResponse.json({ redirect: AIRBNB_URL });
    }
    const rate = await hitVisitRate(geo.ip);
    const decision = await evaluateAccess({
      ip: geo.ip,
      country: geo.country,
      fingerprint,
      isBot: bot,
      rateLimited: rate.limited,
    });
    const dest = (await redirectFor(decision)) || AIRBNB_URL;
    await logVisit({
      geo,
      ua,
      fingerprint,
      decision,
      isBot: bot,
      path: "/",
    });
    return NextResponse.json({ redirect: dest });
  } catch {
    return NextResponse.json({ redirect: AIRBNB_URL });
  }
}
