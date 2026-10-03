import { requireAdmin } from "@/lib/admin-guard";
import { DECISION_LABEL, type VisitDecision } from "@/lib/constants";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, { csrf: false });
  if (auth.error) return auth.error;
  const db = await getDb();
  const items = await db
    .collection("visits")
    .find({})
    .sort({ createdAt: -1 })
    .limit(5000)
    .toArray();

  const header = [
    "时间",
    "IP",
    "国家",
    "省/州",
    "城市",
    "位置",
    "浏览器",
    "系统",
    "设备",
    "特征码",
    "结果",
    "机器人",
    "UA",
  ];
  const lines = [
    header.join(","),
    ...items.map((item) =>
      [
        item.createdAt instanceof Date ? item.createdAt.toISOString() : "",
        csv(item.ip),
        csv(item.country),
        csv(item.region),
        csv(item.city),
        csv(item.location),
        csv(item.browser),
        csv(item.os),
        csv(item.device),
        csv(item.fingerprint),
        csv(DECISION_LABEL[item.decision as VisitDecision] || item.decision),
        item.isBot ? "是" : "否",
        csv(item.ua),
      ].join(","),
    ),
  ];
  const body = "\uFEFF" + lines.join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="visits.csv"',
    },
  });
}

function csv(v: unknown) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}
