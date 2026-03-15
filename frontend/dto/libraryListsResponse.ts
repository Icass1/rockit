import {
    BaseAlbumWithoutSongsResponseSchema,
    BasePlaylistResponseSchema,
    BaseSongWithAlbumResponseSchema,
    BaseStationResponseSchema,
    BaseVideoResponseSchema,
} from "@/dto";
import { z } from "zod";

export const LibraryListsResponseSchema = z.object({
    albums: z
        .array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema))
        .default([]),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)).default([]),
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)).default([]),
    videos: z.array(z.lazy(() => BaseVideoResponseSchema)).default([]),
    stations: z.array(z.lazy(() => BaseStationResponseSchema)).default([]),
    shared: z.array(z.lazy(() => BasePlaylistResponseSchema)).default([]),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
