import { z } from "zod";
import {
    BaseAlbumWithoutSongsResponseSchema,
    BasePlaylistResponseSchema,
} from "@/dto";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
