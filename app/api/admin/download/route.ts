import { get } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) {
    return new Response("无效文件", { status: 400 });
  }
  const db = await getDb();
  const file = await db.collection("uploads").findOne({ _id: new ObjectId(id) });
  if (!file?.pathname) {
    return new Response("未找到", { status: 404 });
  }
  try {
    const result = await get(String(file.pathname), { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new Response("读取失败", { status: 404 });
    }
    const name = String(file.pathname).split("/").pop() || "file";
    return new Response(result.stream, {
      headers: {
        "content-type": String(file.contentType || "application/octet-stream"),
        "content-disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new Response("读取失败", { status: 404 });
  }
}
