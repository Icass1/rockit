import type { JSX } from "react";
import { notFound } from "next/navigation";
import {
    artistNameFromRoute,
    getArtistPageAsync,
} from "@/lib/services/artistService";
import ArtistClient from "@/components/Artist/ArtistClient";

export default async function ArtistByNamePage({
    params,
}: {
    params: Promise<{ name: string }>;
}): Promise<JSX.Element> {
    const { name: segment } = await params;
    const name = artistNameFromRoute(segment);
    const page = await getArtistPageAsync(undefined, name);
    if (!page) notFound();
    return <ArtistClient key={name} initialPage={page} artistName={name} />;
}
