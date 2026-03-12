import {
    BaseAlbumWithoutSongsResponseSchema,
    BasePlaylistResponseSchema,
    BaseSongWithoutAlbumResponseSchema,
    BaseStationResponseSchema,
    BaseVideoResponseSchema,
} from "@/dto";
import { z } from "zod";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
    videos: z.array(z.lazy(() => BaseVideoResponseSchema)),
    stations: z.array(z.lazy(() => BaseStationResponseSchema)),
    shared: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
