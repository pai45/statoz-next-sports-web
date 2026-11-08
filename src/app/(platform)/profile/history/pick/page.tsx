import type { Metadata } from "next";

import { ProfileHistoryScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "Pick History | StatOz",
  description: "Review your StatOz picks, positions, exposure, and profit.",
};

export default function PickHistoryPage() {
  return <ProfileHistoryScreen section="pick" />;
}
