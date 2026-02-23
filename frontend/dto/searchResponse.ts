import * as z from "zod";
import { RockItSongWithAlbumResponse } from "./rockItSongWithAlbumResponse";
import { RockItAlbumWithoutSongsResponse } from "./rockItAlbumWithoutSongsResponse";
import { RockItArtistResponse } from "./rockItArtistResponse";
import { RockItPlaylistResponse } from "./rockItPlaylistResponse";

export const SpotifySearchResultsResponse = z.object({
    songs: z.array(RockItSongWithAlbumResponse),
    albums: z.array(RockItAlbumWithoutSongsResponse),
    artists: z.array(RockItArtistResponse),
    playlists: z.array(RockItPlaylistResponse),
});

export const SearchResultsResponse = z.object({
    spotifyResults: SpotifySearchResultsResponse,
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponse>;
