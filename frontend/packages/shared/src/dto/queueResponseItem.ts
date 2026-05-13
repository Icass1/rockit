// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseSongWithoutAlbumResponseSchema } from "./baseSongWithoutAlbumResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const QueueResponseItemSchema = z.object({
    queueMediaId: z.number(),
    listPublicId: z.string(),
    media: z.union([
        z.lazy(() => BaseSongWithAlbumResponseSchema),
        z.lazy(() => BaseVideoResponseSchema),
        z.lazy(() => BaseSongWithoutAlbumResponseSchema),
    ]),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
