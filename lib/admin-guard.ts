import { NextResponse } from "next/server";
import { csrfOk, readSession, sameOrigin } from "@/lib/session";
import { pingDb } from "@/lib/mongo";

export async function requireAdmin(request: Request, opts?: { csrf?: boolean }) {
  if (!sameOrigin(request)) {
    return { error: NextResponse.json({ error: "来源不合法" }, { status: 403 }) };
  }
  const session = await readSession();
  if (!session) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }
  if (opts?.csrf !== false && request.method !== "GET" && request.method !== "HEAD") {
    if (!csrfOk(session, request.headers.get("x-csrf-token"))) {
      return { error: NextResponse.json({ error: "CSRF 校验失败" }, { status: 403 }) };
    }
  }
  const dbOk = await pingDb();
  if (!dbOk) {
    return { error: NextResponse.json({ error: "数据库未连接" }, { status: 503 }) };
  }
  return { session };
}
