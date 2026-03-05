import SpotifyAlbumClient from "@/components/Spotify/Album";

export default async function Page({
    params,
}: {
    params: { spotifyId: string };
}) {
    const { spotifyId } = await params;
    return <SpotifyAlbumClient spotifyId={spotifyId} />;
}
