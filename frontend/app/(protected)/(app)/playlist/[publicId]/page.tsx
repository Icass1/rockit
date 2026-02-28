import { cache } from "react";
import { notFound } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";
import PlaylistHeader from "@/components/Playlist/PlaylistHeader";
import PlaylistSongsView from "@/components/Playlist/PlaylistSongsView";

const getPlaylist = cache(async (publicId: string) => {
    const playlist = await rockIt.playlistManager
        .getPlaylistAsync(publicId)
        .catch(() => null); // ← normaliza errores de red / 5xx / timeouts
    return playlist;
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const playlist = await getPlaylist(publicId);

    if (!playlist) {
        return {};
    }

    return {
        title: playlist.name,
    };
}

export default async function PlaylistPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const playlistResponse = await getPlaylist(publicId);

    if (!playlistResponse) notFound();

    return (
        <div className="relative flex h-full w-full flex-col gap-2 px-3 md:flex-row md:px-2">
            <PlaylistHeader
                playlist={playlistResponse}
                className="hidden w-full md:flex"
            />

            <PlaylistSongsView playlist={playlistResponse} />
        </div>
    );
}
