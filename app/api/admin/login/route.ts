import { NextResponse } from "next/server";
import { readRequestGeo } from "@/lib/geo";
import { pingDb } from "@/lib/mongo";
import { hitLoginFail, isLoginLocked } from "@/lib/rate-limit";
import {
  createSession,
  passwordOk,
  sameOrigin,
  writeSession,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "来源不合法" }, { status: 403 });
  }
  const dbOk = await pingDb();
  if (!dbOk) {
    return NextResponse.json({ error: "数据库未连接" }, { status: 503 });
  }

  const geo = readRequestGeo(request);
  if (await isLoginLocked(geo.ip)) {
    return NextResponse.json({ error: "尝试过多，请稍后再试" }, { status: 429 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "未配置后台密码" }, { status: 500 });
  }
  if (!passwordOk(password)) {
    await hitLoginFail(geo.ip);
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const session = createSession();
  try {
    await writeSession(session);
  } catch {
    return NextResponse.json({ error: "未配置 SESSION_SECRET" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, csrf: session.csrf });
}
