import { geolocation, ipAddress } from "@vercel/functions";
import { normalizeIp } from "@/lib/ip";

export type RequestGeo = {
  ip: string;
  country: string;
  region: string;
  city: string;
};

export function readRequestGeo(request: Request): RequestGeo {
  const geo = geolocation(request);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const vercelIp = ipAddress(request);
  const ip = normalizeIp(vercelIp || realIp || forwarded || "");
  const cityRaw = geo.city || "";
  let city = cityRaw;
  try {
    city = cityRaw ? decodeURIComponent(cityRaw) : "";
  } catch {
    city = cityRaw;
  }
  return {
    ip: ip || "unknown",
    country: (geo.country || "").toUpperCase(),
    region: geo.countryRegion || "",
    city,
  };
}

export function formatLocation(geo: RequestGeo): string {
  const parts = [geo.country, geo.region, geo.city].filter(Boolean);
  return parts.join(" / ") || "未知";
}
