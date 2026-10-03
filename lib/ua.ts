import { UAParser } from "ua-parser-js";

export function parseBrowser(ua: string) {
  const parser = new UAParser(ua || "");
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  const browserLabel = [browser.name, browser.version].filter(Boolean).join(" ");
  const osLabel = [os.name, os.version].filter(Boolean).join(" ");
  const deviceLabel = [device.vendor, device.model, device.type]
    .filter(Boolean)
    .join(" ");
  return {
    ua: ua || "",
    browser: browserLabel || "未知浏览器",
    os: osLabel || "未知系统",
    device: deviceLabel || "未知设备",
  };
}
