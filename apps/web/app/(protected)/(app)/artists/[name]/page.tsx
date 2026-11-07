import type { JSX } from "react";
import { notFound } from "next/navigation";
import { getArtistByName } from "@/lib/server/resources";
import { artistNameFromRoute } from "@/lib/utils/artistRoute";
import ArtistClient from "@/components/Artist/ArtistClient";

export default async function ArtistByNamePage({
    params,
}: {
    params: Promise<{ name: string }>;
}): Promise<JSX.Element> {
    const { name: segment } = await params;
    const name = artistNameFromRoute(segment);
    const page = await getArtistByName(name);
    if (!page) notFound();
    return <ArtistClient key={name} initialPage={page} artistName={name} />;
}
