import * as z from "zod";
import { RockItAlbumWithoutSongsResponse } from "./rockItAlbumWithoutSongsResponse";
import { RockItPlaylistResponse } from "./rockItPlaylistResponse";

export const LibraryListsResponse = z.object({
    albums: z.array(RockItAlbumWithoutSongsResponse),
    playlists: z.array(RockItPlaylistResponse),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponse>;
