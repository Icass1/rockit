// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BasePlaylistResponseSchema } from "./basePlaylistResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const AddFromUrlResponseSchema = z.object({
    data: z.union([
        z.lazy(() => BaseSongWithAlbumResponseSchema),
        z.lazy(() => BaseVideoResponseSchema),
        z.lazy(() => BasePlaylistResponseSchema),
        z.lazy(() => BaseAlbumWithSongsResponseSchema),
        z.lazy(() => BaseArtistResponseSchema),
    ]),
});

export type AddFromUrlResponse = z.infer<typeof AddFromUrlResponseSchema>;
