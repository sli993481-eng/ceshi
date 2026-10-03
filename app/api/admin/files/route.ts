import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const body = (await request.json()) as {
    pathname?: string;
    contentType?: string;
    url?: string;
  };
  const pathname = (body.pathname || "").trim();
  if (!pathname || pathname.includes("..") || !pathname.startsWith("uploads/")) {
    return NextResponse.json({ error: "路径无效" }, { status: 400 });
  }
  const db = await getDb();
  const origin = new URL(request.url).origin;
  const existing = await db.collection("uploads").findOne({ pathname });
  if (!existing) {
    const inserted = await db.collection("uploads").insertOne({
      url: body.url || "",
      pathname,
      contentType: body.contentType || "",
      createdAt: new Date(),
    });
    return NextResponse.json({
      id: String(inserted.insertedId),
      downloadUrl: `${origin}/api/admin/download?id=${String(inserted.insertedId)}`,
    });
  }
  return NextResponse.json({
    id: String(existing._id),
    downloadUrl: `${origin}/api/admin/download?id=${String(existing._id)}`,
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const db = await getDb();
  const items = await db
    .collection("uploads")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      pathname: item.pathname,
      contentType: item.contentType,
      downloadPath: `/api/admin/download?id=${String(item._id)}`,
      downloadUrl: `${origin}/api/admin/download?id=${String(item._id)}`,
      createdAt: item.createdAt,
    })),
  });
}
