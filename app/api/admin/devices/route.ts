import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";
import { readRequestGeo } from "@/lib/geo";
import { getDb } from "@/lib/mongo";
import { sanitizeFingerprint } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const db = await getDb();
  const items = await db
    .collection("device_rules")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      fingerprint: item.fingerprint,
      note: item.note || "",
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const body = (await request.json()) as { fingerprint?: string; note?: string };
  const fingerprint = sanitizeFingerprint(body.fingerprint);
  const note = (body.note || "").trim().slice(0, 200);
  if (!fingerprint) {
    return NextResponse.json({ error: "特征码必须是 64 位十六进制" }, { status: 400 });
  }
  const db = await getDb();
  try {
    await db.collection("device_rules").insertOne({
      fingerprint,
      note,
      createdAt: new Date(),
    });
  } catch {
    return NextResponse.json({ error: "该设备已在黑名单" }, { status: 409 });
  }
  const geo = readRequestGeo(request);
  await writeAudit("device_ban", { fingerprint, note }, geo.ip);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "id 无效" }, { status: 400 });
  }
  const db = await getDb();
  const result = await db.collection("device_rules").findOneAndDelete({
    _id: new ObjectId(id),
  });
  if (!result) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }
  const geo = readRequestGeo(request);
  await writeAudit("device_unban", { fingerprint: result.fingerprint }, geo.ip);
  return NextResponse.json({ ok: true });
}
