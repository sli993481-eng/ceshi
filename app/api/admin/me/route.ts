import { NextResponse } from "next/server";
import { pingDb } from "@/lib/mongo";
import { readSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  const dbOk = await pingDb();
  if (!session) {
    return NextResponse.json({ ok: false, dbOk }, { status: 401 });
  }
  return NextResponse.json({ ok: true, dbOk, csrf: session.csrf });
}
