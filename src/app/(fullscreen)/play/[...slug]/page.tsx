import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameLauncher, gameForHref, playableGameHrefs } from "@/features/games";

/**
 * Every playable route is known up front, so all of them prerender — which the
 * GitHub Pages export requires, since it has no server to resolve a slug.
 */
export function generateStaticParams() {
  return playableGameHrefs().map((href) => ({
    slug: href.replace(/^\/play\//, "").split("/"),
  }));
}

async function resolve(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  return gameForHref(`/play/${slug.join("/")}`);
}

export async function generateMetadata({
  params,
}: PageProps<"/play/[...slug]">): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { title: "Play" };

  return {
    title: found.entry.title,
    description: found.entry.subtitle,
  };
}

export default async function PlayPage({ params }: PageProps<"/play/[...slug]">) {
  const found = await resolve(params);
  if (!found) notFound();

  return <GameLauncher game={found.game} entry={found.entry} />;
}
