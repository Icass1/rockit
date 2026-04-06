import { z } from "zod";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BasePlaylistResponseSchema } from "./basePlaylistResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const MediaResponseSchema = z.union([
    z.lazy(() => BaseSongWithAlbumResponseSchema),
    z.lazy(() => BaseAlbumWithSongsResponseSchema),
    z.lazy(() => BaseArtistResponseSchema),
    z.lazy(() => BasePlaylistResponseSchema),
    z.lazy(() => BaseVideoResponseSchema),
]);

export type MediaResponse = z.infer<typeof MediaResponseSchema>;
