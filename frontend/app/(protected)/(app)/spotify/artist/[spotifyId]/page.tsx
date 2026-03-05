import SpotifyArtistClient from "@/components/Spotify/Artist";

export default function Page({ params }: { params: { spotifyId: string } }) {
    return <SpotifyArtistClient spotifyId={params.spotifyId} />;
}
