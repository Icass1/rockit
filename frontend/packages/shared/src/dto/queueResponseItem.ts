// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const QueueResponseItemSchema = z.object({
    queueMediaId: z.number(),
    listPublicId: z.string(),
    media: z.union([
        z.lazy(() => BaseSongWithAlbumResponseSchema),
        z.lazy(() => BaseVideoResponseSchema),
    ]),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
