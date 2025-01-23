import type {
    SpotifyAlbum,
    SpotifyArtist,
    SpotifyPlaylist,
    SpotifyTrack,
} from "@/types/spotify";
import { atom, map } from "nanostores";
import { type Station } from "@/stores/audio";

export const searchQuery = atom<string>("");

export const filteredStations = atom<Station[]>([]);

export const searchResults = map<{
    albums: SpotifyAlbum[] | undefined;
    playlists: SpotifyPlaylist[] | undefined;
    songs: SpotifyTrack[] | undefined;
    artists: SpotifyArtist[] | undefined;
}>({
    albums: undefined,
    playlists: undefined,
    songs: undefined,
    artists: undefined,
});
