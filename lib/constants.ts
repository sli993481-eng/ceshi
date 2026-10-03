export const AIRBNB_URL = "https://www.airbnb.com/";
export const ALLOWED_COUNTRY = "IL";
export const SESSION_COOKIE = "vc_admin";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX_HITS = 30;
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_MAX_FAILS = 5;
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
] as const;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type VisitDecision =
  | "allow"
  | "geo_block"
  | "ip_blacklist"
  | "device_blacklist"
  | "bot"
  | "rate_limit";

export const DECISION_LABEL: Record<VisitDecision, string> = {
  allow: "放行",
  geo_block: "地理拦截",
  ip_blacklist: "IP 黑名单",
  device_blacklist: "设备黑名单",
  bot: "机器人",
  rate_limit: "超频拦截",
};
