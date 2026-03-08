import {
    BaseAlbumWithoutSongsResponseSchema,
    BasePlaylistResponseSchema,
    BaseSongWithoutAlbumResponseSchema,
    BaseVideoResponseSchema,
} from "@/dto";
import { z } from "zod";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)).optional().default([]),
    videos: z.array(z.lazy(() => BaseVideoResponseSchema)).optional().default([]),
    stations: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)).optional().default([]),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
