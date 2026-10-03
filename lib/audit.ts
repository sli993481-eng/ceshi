import { getDb } from "@/lib/mongo";

export async function writeAudit(action: string, detail: Record<string, unknown>, ip: string) {
  const db = await getDb();
  await db.collection("audits").insertOne({
    action,
    detail,
    ip,
    createdAt: new Date(),
  });
}
