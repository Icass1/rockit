import SpotifyPlaylistClient from "@/components/Spotify/Playlist";

export default async function Page({
    params,
}: {
    params: { spotifyId: string };
}) {
    const { spotifyId } = await params;
    return <SpotifyPlaylistClient spotifyId={spotifyId} />;
}
