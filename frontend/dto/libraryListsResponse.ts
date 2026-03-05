import {
    BaseAlbumWithoutSongsResponseSchema,
    BasePlaylistResponseSchema,
} from "@/dto";
import { z } from "zod";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
