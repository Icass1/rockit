import { RockItAlbum, RockItArtist, RockItSong } from "@/types/rockIt";
import * as z from "zod";

export const SpotifySearchResultsResponse = z.object({
    songs: z.array(RockItSong),
    albums: z.array(RockItAlbum),
    artists: z.array(RockItArtist),
});

export const SearchResultsResponse = z.object({
    spotifyResults: SpotifySearchResultsResponse,
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponse>;
