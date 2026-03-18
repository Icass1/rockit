import { z } from "zod";
import {
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
} from "@/dto";

export const QueueResponseItemSchema = z.object({
    queueMediaId: z.number(),
    listPublicId: z.string(),
    media: z.union([
        z.lazy(() => BaseSongWithAlbumResponseSchema),
        z.lazy(() => BaseVideoResponseSchema),
    ]),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
