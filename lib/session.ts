import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/constants";

export type AdminSession = {
  v: 1;
  exp: number;
  csrf: string;
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET 未配置或过短");
  }
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSession(): AdminSession {
  return {
    v: 1,
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
    csrf: randomBytes(32).toString("hex"),
  };
}

export function encodeSession(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (data.v !== 1 || data.exp < Date.now() || !data.csrf) return null;
    return data;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<AdminSession | null> {
  try {
    const jar = await cookies();
    return decodeSession(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function writeSession(session: AdminSession) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function passwordOk(input: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function csrfOk(session: AdminSession, header: string | null) {
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(session.csrf);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("host") || "";
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
