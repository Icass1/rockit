import { BaseSongWithAlbumResponseSchema } from "@/dto";
import { z } from "zod";

export const QueueResponseItemSchema = z.object({
    queueMediaId: z.number(),
    listPublicId: z.string(),
    song: z.lazy(() => BaseSongWithAlbumResponseSchema),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
