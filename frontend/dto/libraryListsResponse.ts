import { z } from "zod";
import {
    BaseAlbumWithSongsResponseSchema,
    BasePlaylistResponseSchema,
} from "@/dto";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
