// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseVideoResponseSchema } from './baseVideoResponse';
import { BaseSongWithoutAlbumResponseSchema } from './baseSongWithoutAlbumResponse';
import { BaseSongWithAlbumResponseSchema } from './baseSongWithAlbumResponse';

export const QueueResponseItemSchema = z.object({
    queueMediaId: z.number(),
    listPublicId: z.string().nullable(),
    media: z.union([z.lazy(() => BaseSongWithAlbumResponseSchema), z.lazy(() => BaseVideoResponseSchema), z.lazy(() => BaseSongWithoutAlbumResponseSchema)]),
    randomIndex: z.number(),
    sortedIndex: z.number(),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;