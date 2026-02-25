import { BaseAlbumResponseSchema } from "@/dto/baseAlbumResponse";
import { BasePlaylistResponseSchema } from "@/dto/basePlaylistResponse";
import { z } from "zod";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
