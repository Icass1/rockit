import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "@/dto";

export const QueueResponseItemSchema = z.object({
    queueMediaId: z.number(),
    listPublicId: z.string(),
    song: z.lazy(() => BaseSongWithAlbumResponseSchema),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
