import type { Metadata } from "next";

import { ProfileHistoryScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "Games History | StatOz",
  description: "Review your StatOz game results and career match archive.",
};

export default function GamesHistoryPage() {
  return <ProfileHistoryScreen section="games" />;
}
