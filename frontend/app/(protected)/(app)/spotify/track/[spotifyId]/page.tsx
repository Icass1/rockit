import SpotifyTrackClient from "@/components/Spotify/Track";

export default function Page({ params }: { params: { spotifyId: string } }) {
    return <SpotifyTrackClient spotifyId={params.spotifyId} />;
}
