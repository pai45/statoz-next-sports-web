import type { Metadata } from "next";

import { ShopSearchScreen } from "@/features/shop";

export const metadata: Metadata = { title: "Shop Search | StatOz" };

export default function ShopSearchPage() { return <ShopSearchScreen />; }
