import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { readRequestGeo } from "@/lib/geo";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "未配置 Vercel Blob" }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;
  if (body.type !== "blob.upload-completed") {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ by: "admin" }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        const db = await getDb();
        await db.collection("uploads").insertOne({
          url: blob.url,
          downloadUrl: blob.downloadUrl || blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          createdAt: new Date(),
        });
        const geo = readRequestGeo(request);
        await writeAudit(
          "upload",
          { pathname: blob.pathname, contentType: blob.contentType },
          geo.ip,
        );
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
