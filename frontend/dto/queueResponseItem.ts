import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "@/dto";

export const QueueResponseItemSchema = z.object({
    queueSongId: z.number(),
    listPublicId: z.string(),
    song: z.lazy(() => BaseSongWithAlbumResponseSchema),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
