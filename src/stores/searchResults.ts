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
    albums: SpotifyAlbum[] | undefined | "error";
    playlists: SpotifyPlaylist[] | undefined | "error";
    songs: SpotifyTrack[] | undefined | "error";
    artists: SpotifyArtist[] | undefined | "error";
}>({
    albums: undefined,
    playlists: undefined,
    songs: undefined,
    artists: undefined,
});
