import { QueueResponseItemListSchema } from "@/dto/queueResponseItemList";
import { z } from "zod";

export const QueueResponseItemSchema = z.object({
    queueSongId: z.number(),
    list: z.lazy(() => QueueResponseItemListSchema),
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;
