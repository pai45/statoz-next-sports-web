import { notFound } from "next/navigation";

import { F1TrackMapScreen } from "@/features/matches";
import { italianGpReport } from "@/mocks/matches/details";

export function generateStaticParams() {
  return [{ matchId: italianGpReport.id }];
}

export default async function TrackMapPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (matchId !== italianGpReport.id) notFound();
  return <F1TrackMapScreen report={italianGpReport} />;
}
