import SpotifyPlaylistClient from "@/components/Spotify/Playlist";

export default function Page({ params }: { params: { spotifyId: string } }) {
    return <SpotifyPlaylistClient spotifyId={params.spotifyId} />;
}
