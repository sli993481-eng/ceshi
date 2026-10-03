import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [total, blocked, allowed, bots, last24] = await Promise.all([
    db.collection("visits").countDocuments(),
    db.collection("visits").countDocuments({ decision: { $ne: "allow" } }),
    db.collection("visits").countDocuments({ decision: "allow" }),
    db.collection("visits").countDocuments({ decision: "bot" }),
    db.collection("visits").countDocuments({ createdAt: { $gte: since } }),
  ]);
  return NextResponse.json({ total, blocked, allowed, bots, last24 });
}
