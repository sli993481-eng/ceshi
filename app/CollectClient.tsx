"use client";

import { useEffect } from "react";

const AIRBNB = "https://www.airbnb.com/";

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canvasSignal() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "nocanvas";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 120, 40);
    ctx.fillStyle = "#069";
    ctx.fillText("fp", 2, 2);
    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

async function fingerprint() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const parts = [
    nav.userAgent,
    nav.language,
    [...nav.languages].join(","),
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.hardwareConcurrency || 0,
    nav.maxTouchPoints || 0,
    nav.deviceMemory || 0,
    canvasSignal(),
  ];
  return sha256Hex(parts.join("|"));
}

export default function CollectClient() {
  useEffect(() => {
    const run = async () => {
      let fp = "";
      try {
        fp = await Promise.race([
          fingerprint(),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 900)),
        ]);
      } catch {
        fp = "";
      }
      try {
        const res = await fetch("/api/decide", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fingerprint: fp }),
        });
        const data = (await res.json()) as { redirect?: string };
        window.location.replace(data.redirect || AIRBNB);
      } catch {
        window.location.replace(AIRBNB);
      }
    };
    void run();
  }, []);

  return <div className="min-h-screen bg-white" />;
}
