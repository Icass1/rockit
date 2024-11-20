import type { SpotifyAlbum, SpotifyArtist, SpotifyPlaylist, SpotifyTrack } from '@/types/spotify';
import { atom, map } from 'nanostores';



export const searchQuery = atom<string>("supertramp")

export const searchResults = map<{
    albums: SpotifyAlbum[] | undefined,
    playlists: SpotifyPlaylist[] | undefined,
    songs: SpotifyTrack[] | undefined
    artists: SpotifyArtist[] | undefined
}>({
    albums: undefined,
    playlists: undefined,
    songs: undefined,
    artists: undefined
});
