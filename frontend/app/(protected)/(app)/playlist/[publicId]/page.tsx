import { rockIt } from "@/lib/rockit/rockIt";
import PlaylistHeader from "@/components/Playlist/PlaylistHeader";
import PlaylistSongsView from "@/components/Playlist/PlaylistSongsView";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const playlistResponse =
        await rockIt.playlistManager.getSpotifyPlaylistAsync(publicId);

    if (!playlistResponse) {
        return {};
    }

    return {
        title: playlistResponse.name,
    };
}

export default async function PlaylistPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const playlistResponse =
        await rockIt.playlistManager.getSpotifyPlaylistAsync(publicId);

    if (!playlistResponse) {
        return null;
    }

    const playlistWithSongs = {
        ...playlistResponse,
        songs: [],
        internalImageUrl: null,
        owner: "",
        externalImages: [],
    };

    return (
        <div className="relative flex h-full w-full flex-col gap-2 px-3 md:flex-row md:px-2">
            <PlaylistHeader
                playlistResponse={playlistWithSongs as unknown as Parameters<typeof PlaylistHeader>[0]["playlistResponse"]}
                className="hidden w-full md:flex"
            />

            <PlaylistSongsView playlistResponse={playlistWithSongs as unknown as Parameters<typeof PlaylistSongsView>[0]["playlistResponse"]} />
        </div>
    );
}
