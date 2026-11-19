import { adminFetch } from "@/lib/api";
import LaunchAdsClient, { type LaunchAd } from "./LaunchAdsClient";

export default async function LaunchAdsPage() {
  let items: LaunchAd[] = [];
  try {
    items = (await adminFetch<{ items: LaunchAd[] }>("/admin/launch-ads")).items;
  } catch {}
  return <LaunchAdsClient initial={items} />;
}
