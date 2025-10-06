import PlaylistHeader from "@/components/Playlist/PlaylistHeader";
import PlaylistSongsView from "@/components/Playlist/PlaylistSongsView";
import { NextResponse } from "next/server";
import { RockItPlaylistResponse } from "@/responses/rockItPlaylistResponse";

async function getPlaylist(id: string) {
    let playlist: RockItPlaylistResponse | undefined;

    console.log("(getPlaylist)", id);

    return playlist;
}
export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const playlist = await getPlaylist(id);

    if (!playlist) {
        return {};
    }

    return {
        title: `${playlist.name} by ${playlist.owner}`,
        description: `Listen to ${playlist.name} by ${playlist.owner}`,
        openGraph: {
            title: `${playlist.name} by ${playlist.owner}`,
            description: `Listen to ${playlist.name} by ${playlist.owner}`,
            type: "music.playlist",
            url: `https://rockit.rockhosting.org/playlist/${id}`,
            images: [
                {
                    url: playlist.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: playlist.name,
                },
            ],
        },
        twitter: {
            card: "",
            title: `${playlist.name} by ${playlist.owner}`,
            description: `Listen to ${playlist.name} by ${playlist.owner}`,
            images: [
                {
                    url: playlist.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: playlist.name,
                },
            ],
        },
    };
}

export default async function PlaylistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here

    const playlist = await getPlaylist(id);

    if (!playlist) {
        return new NextResponse(
            JSON.stringify({
                error: "",
            }),
            {
                status: 404,
            }
        );
    }

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
                playlistResponse={playlist}
                className="hidden w-full md:flex"
            />

            <PlaylistSongsView playlistResponse={playlist} />
        </div>
    );
}
