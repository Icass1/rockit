import PlaylistHeader from "@/components/Playlist/PlaylistHeader";
import PlaylistSongsView from "@/components/Playlist/PlaylistSongsView";
import { rockIt } from "@/lib/rockit/rockIt";

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
        title: `${playlistResponse.name} by ${playlistResponse.owner}`,
        description: `Listen to ${playlistResponse.name} by ${playlistResponse.owner}`,
        openGraph: {
            title: `${playlistResponse.name} by ${playlistResponse.owner}`,
            description: `Listen to ${playlistResponse.name} by ${playlistResponse.owner}`,
            type: "music.playlist",
            url: `https://rockit.rockhosting.org/playlist/${publicId}`,
            images: [
                {
                    url: playlistResponse.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: playlistResponse.name,
                },
            ],
        },
        twitter: {
            card: "",
            title: `${playlistResponse.name} by ${playlistResponse.owner}`,
            description: `Listen to ${playlistResponse.name} by ${playlistResponse.owner}`,
            images: [
                {
                    url: playlistResponse.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: playlistResponse.name,
                },
            ],
        },
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

    return (
        <div className="relative flex h-full w-full flex-col gap-2 px-3 md:flex-row md:px-2">
            {/* <Image
                width={600}
                height={600}
                src={playlist.internalImageBluredUrl ?? rockIt.PLAYLIST_PLACEHOLDER_}
                alt=""
                className="fixed top-0 left-0 z-0 h-full w-full object-cover opacity-35"
            /> */}

            <PlaylistHeader
                playlistResponse={playlistResponse}
                className="hidden w-full md:flex"
            />

            <PlaylistSongsView playlistResponse={playlistResponse} />
        </div>
    );
}
