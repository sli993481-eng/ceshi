import { getDb } from "@/lib/mongo";

export function parsePublicHttpUrl(raw: string) {
  const text = raw.trim();
  if (!text) return { error: "请填写网址" as const };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { error: "网址格式不正确，请带上 https://" as const };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { error: "只允许 http 或 https 网址" as const };
  }
  if (url.username || url.password) {
    return { error: "网址不能包含账号密码" as const };
  }
  return { url: url.toString() };
}

export async function getTargetUrl() {
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ key: "app" });
  return typeof doc?.targetUrl === "string" ? doc.targetUrl : "";
}

export async function setTargetUrl(targetUrl: string) {
  const db = await getDb();
  await db.collection("settings").updateOne(
    { key: "app" },
    { $set: { key: "app", targetUrl, updatedAt: new Date() } },
    { upsert: true },
  );
}
