import SpotifyTrackClient from "@/components/Spotify/Track";

export default async function Page({
    params,
}: {
    params: { spotifyId: string };
}) {
    const { spotifyId } = await params;
    return <SpotifyTrackClient spotifyId={spotifyId} />;
}
