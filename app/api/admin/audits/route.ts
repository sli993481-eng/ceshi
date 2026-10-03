import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const db = await getDb();
  const items = await db
    .collection("audits")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      action: item.action,
      detail: item.detail,
      ip: item.ip,
      createdAt: item.createdAt,
    })),
  });
}
