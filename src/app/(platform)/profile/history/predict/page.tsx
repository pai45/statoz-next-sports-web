import type { Metadata } from "next";

import { ProfileHistoryScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "Prediction History | StatOz",
  description: "Review your StatOz prediction quizzes and match calls.",
};

export default function PredictionHistoryPage() {
  return <ProfileHistoryScreen section="predict" />;
}
