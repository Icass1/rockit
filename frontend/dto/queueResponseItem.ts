import { z } from "zod";
import { BaseSongResponseSchema, QueueResponseItemListSchema } from "@/dto";

export const QueueResponseItemSchema = z.object({
    queueSongId: z.number(),
    list: z.lazy(() => QueueResponseItemListSchema),
    song: z.lazy(() => BaseSongResponseSchema),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
