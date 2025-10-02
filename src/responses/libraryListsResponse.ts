import { RockItAlbumWithoutSongs, RockItPlaylist } from "@/types/rockIt";
import * as z from "zod";

export const LibraryListsResponse = z.object({
    albums: z.array(RockItAlbumWithoutSongs),
    playlists: z.array(RockItPlaylist),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponse>;
