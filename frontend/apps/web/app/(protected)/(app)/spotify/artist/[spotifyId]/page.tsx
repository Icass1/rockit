import SpotifyArtistClient from "@/components/Spotify/Artist";

export default async function Page({
    params,
}: {
    params: { spotifyId: string };
}) {
    const { spotifyId } = await params;
    return <SpotifyArtistClient spotifyId={spotifyId} />;
}
