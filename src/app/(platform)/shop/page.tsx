import { Suspense } from "react";

import { ShopScreen } from "@/features/shop";

export default function ShopPage() {
  return <Suspense fallback={<div className="grid min-h-96 place-items-center font-display text-sm font-black text-muted">LOADING MARKET…</div>}><ShopScreen /></Suspense>;
}
