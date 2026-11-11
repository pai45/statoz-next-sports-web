import { Suspense } from "react";
import type { Metadata } from "next";

import { ShopScreen } from "@/features/shop";

export const metadata: Metadata = { title: "The Locker Room | StatOz Sports", description: "Build your signature Sports profile with avatars, team frames, banners, and Oz Coins." };

export default function ShopPage() {
  return <Suspense fallback={<div className="grid min-h-96 place-items-center font-display text-sm font-black text-muted">LOADING MARKET…</div>}><ShopScreen /></Suspense>;
}
