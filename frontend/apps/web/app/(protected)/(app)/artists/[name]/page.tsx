import { notFound } from "next/navigation";
import ArtistClient from "@/components/Artist/ArtistClient";
import { getArtistPageAsync } from "@/lib/services/artistService";

export default async function ArtistByNamePage({
    params,
}: {
    params: Promise<{ name: string }>;
}) {
    const { name } = await params;
    const page = await getArtistPageAsync(undefined, name);
    if (!page) notFound();
    return <ArtistClient key={name} initialPage={page} artistName={name} />;
}
