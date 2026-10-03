import { NextResponse } from "next/server";
import { evaluateAccess, redirectFor } from "@/lib/access";
import { AIRBNB_URL, type VisitDecision } from "@/lib/constants";
import { readRequestGeo } from "@/lib/geo";
import { hasMongoUri } from "@/lib/mongo";
import { hitVisitRate } from "@/lib/rate-limit";
import { logVisit } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const geo = readRequestGeo(request);
  const ua = request.headers.get("user-agent") || "";
  let decision: VisitDecision = "bot";
  let dest = AIRBNB_URL;

  try {
    if (!hasMongoUri()) {
      return NextResponse.redirect(AIRBNB_URL, 302);
    }
    const rate = await hitVisitRate(geo.ip);
    decision = await evaluateAccess({
      ip: geo.ip,
      country: geo.country,
      fingerprint: "",
      isBot: true,
      rateLimited: rate.limited,
    });
    dest = (await redirectFor(decision)) || AIRBNB_URL;
    await logVisit({
      geo,
      ua,
      fingerprint: "",
      decision,
      isBot: true,
      path: new URL(request.url).pathname,
    });
  } catch {
    dest = AIRBNB_URL;
  }

  return NextResponse.redirect(dest, 302);
}
