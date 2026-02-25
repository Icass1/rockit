import { z } from "zod";
import { BasePlaylistResponseSchema } from "./basePlaylistResponse";
import { BaseAlbumResponseSchema } from "./baseAlbumResponse";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
