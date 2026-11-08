import { notFound } from "next/navigation";

import { MarketDetailScreen, allPickMarketIds, pickMarketById } from "@/features/picks";

export function generateStaticParams() { return allPickMarketIds.map((marketId) => ({ marketId })); }

export default async function PickMarketPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params; const market = pickMarketById(marketId); if (!market) notFound();
  return <MarketDetailScreen market={market} />;
}
