import { z } from "zod";
import { QueueResponseItemListSchema } from "@/dto";

export const QueueResponseItemSchema = z.object({
    queueSongId: z.number(),
    list: z.lazy(() => QueueResponseItemListSchema),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
