import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const decision = url.searchParams.get("decision")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const limit = 50;
  const filter: Record<string, unknown> = {};
  if (decision) filter.decision = decision;
  if (q) {
    filter.$or = [
      { ip: { $regex: escapeRegex(q), $options: "i" } },
      { location: { $regex: escapeRegex(q), $options: "i" } },
      { browser: { $regex: escapeRegex(q), $options: "i" } },
      { fingerprint: { $regex: escapeRegex(q), $options: "i" } },
      { ua: { $regex: escapeRegex(q), $options: "i" } },
    ];
  }

  const db = await getDb();
  const col = db.collection("visits");
  const [items, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return NextResponse.json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    items: items.map((item) => ({
      id: String(item._id),
      ip: item.ip,
      location: item.location,
      country: item.country,
      region: item.region,
      city: item.city,
      browser: item.browser,
      os: item.os,
      device: item.device,
      ua: item.ua,
      fingerprint: item.fingerprint || "",
      decision: item.decision,
      isBot: Boolean(item.isBot),
      createdAt: item.createdAt,
    })),
  });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
