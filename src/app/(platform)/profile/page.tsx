import type { Metadata } from "next";

import { ProfileScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "Profile | StatOz",
  description:
    "Your StatOz dossier: level and XP, achievements, career telemetry, the clubs you follow, and your squad loadouts.",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
