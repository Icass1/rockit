import SpotifyAlbumClient from "@/components/Spotify/Album";

export default function Page({ params }: { params: { spotifyId: string } }) {
    return <SpotifyAlbumClient spotifyId={params.spotifyId} />;
}
