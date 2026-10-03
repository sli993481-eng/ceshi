import { NextResponse } from "next/server";
import { clearSession, sameOrigin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "来源不合法" }, { status: 403 });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
