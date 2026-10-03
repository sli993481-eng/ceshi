import ipaddr from "ipaddr.js";

export function normalizeIp(raw: string): string {
  const ip = raw.trim().replace(/^::ffff:/, "");
  try {
    return ipaddr.process(ip).toString();
  } catch {
    return ip;
  }
}

export function ipMatchesRule(ip: string, rule: string): boolean {
  const value = rule.trim();
  if (!value) return false;
  try {
    const addr = ipaddr.process(normalizeIp(ip));
    if (value.includes("/")) {
      const cidr = ipaddr.parseCIDR(value);
      if (addr.kind() !== cidr[0].kind()) return false;
      return addr.match(cidr);
    }
    const other = ipaddr.process(normalizeIp(value));
    if (addr.kind() !== other.kind()) return false;
    return addr.toString() === other.toString();
  } catch {
    return normalizeIp(ip) === normalizeIp(value);
  }
}
