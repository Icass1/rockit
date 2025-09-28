import { RockItAlbumWithoutSongs, RockItArtist, RockItSongWithAlbum } from "@/types/rockIt";
import * as z from "zod";

export const SpotifySearchResultsResponse = z.object({
    songs: z.array(RockItSongWithAlbum),
    albums: z.array(RockItAlbumWithoutSongs),
    artists: z.array(RockItArtist),
});

export const SearchResultsResponse = z.object({
    spotifyResults: SpotifySearchResultsResponse,
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponse>;
