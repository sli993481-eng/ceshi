import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";
import { readRequestGeo } from "@/lib/geo";
import { getDb } from "@/lib/mongo";
import ipaddr from "ipaddr.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "allow" && type !== "deny") {
    return NextResponse.json({ error: "type 无效" }, { status: 400 });
  }
  const db = await getDb();
  const items = await db
    .collection("ip_rules")
    .find({ type })
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      type: item.type,
      value: item.value,
      note: item.note || "",
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const body = (await request.json()) as {
    type?: string;
    value?: string;
    note?: string;
  };
  const type = body.type === "allow" || body.type === "deny" ? body.type : null;
  const value = (body.value || "").trim();
  const note = (body.note || "").trim().slice(0, 200);
  if (!type || !value) {
    return NextResponse.json({ error: "缺少 IP" }, { status: 400 });
  }
  try {
    if (value.includes("/")) ipaddr.parseCIDR(value);
    else ipaddr.process(value);
  } catch {
    return NextResponse.json({ error: "IP 或 CIDR 格式不正确" }, { status: 400 });
  }
  const db = await getDb();
  try {
    await db.collection("ip_rules").insertOne({
      type,
      value,
      note,
      createdAt: new Date(),
    });
  } catch {
    return NextResponse.json({ error: "该规则已存在" }, { status: 409 });
  }
  const geo = readRequestGeo(request);
  await writeAudit("ip_rule_add", { type, value, note }, geo.ip);
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
  const result = await db.collection("ip_rules").findOneAndDelete({
    _id: new ObjectId(id),
  });
  if (!result) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }
  const geo = readRequestGeo(request);
  await writeAudit(
    "ip_rule_delete",
    { type: result.type, value: result.value },
    geo.ip,
  );
  return NextResponse.json({ ok: true });
}
