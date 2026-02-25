import { z } from "zod";

export const QueueResponseItemListSchema = z.object({
    publicId: z.string(),
});

export type QueueResponseItemList = z.infer<typeof QueueResponseItemListSchema>;
