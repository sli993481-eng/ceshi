import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";
import { readRequestGeo } from "@/lib/geo";
import { getTargetUrl, parsePublicHttpUrl, setTargetUrl } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const targetUrl = await getTargetUrl();
  return NextResponse.json({ targetUrl });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const body = (await request.json()) as { targetUrl?: string };
  const parsed = parsePublicHttpUrl(typeof body.targetUrl === "string" ? body.targetUrl : "");
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  await setTargetUrl(parsed.url);
  const geo = readRequestGeo(request);
  await writeAudit("target_url", { targetUrl: parsed.url }, geo.ip);
  return NextResponse.json({ ok: true, targetUrl: parsed.url });
}
