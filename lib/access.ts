import type { VisitDecision } from "@/lib/constants";
import { ALLOWED_COUNTRY } from "@/lib/constants";
import { getDb } from "@/lib/mongo";
import { ipMatchesRule } from "@/lib/ip";

export type AccessInput = {
  ip: string;
  country: string;
  fingerprint: string;
  isBot: boolean;
  rateLimited: boolean;
};

export async function evaluateAccess(input: AccessInput): Promise<VisitDecision> {
  if (input.isBot) return "bot";
  if (input.rateLimited) return "rate_limit";

  const db = await getDb();
  const ipRules = await db.collection("ip_rules").find({}).toArray();
  const deny = ipRules.filter((r) => r.type === "deny");
  const allow = ipRules.filter((r) => r.type === "allow");

  if (deny.some((r) => ipMatchesRule(input.ip, String(r.value)))) {
    return "ip_blacklist";
  }

  if (input.fingerprint) {
    const banned = await db.collection("device_rules").findOne({
      fingerprint: input.fingerprint,
    });
    if (banned) return "device_blacklist";
  }

  const onAllow = allow.some((r) => ipMatchesRule(input.ip, String(r.value)));
  if (onAllow) return "allow";
  if (input.country === ALLOWED_COUNTRY) return "allow";
  return "geo_block";
}

export function redirectFor(decision: VisitDecision) {
  if (decision === "allow") {
    const target = process.env.TARGET_URL || "";
    try {
      const u = new URL(target);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return null;
      }
      return u.toString();
    } catch {
      return null;
    }
  }
  return process.env.BLOCK_REDIRECT_URL || "https://www.airbnb.com/";
}
