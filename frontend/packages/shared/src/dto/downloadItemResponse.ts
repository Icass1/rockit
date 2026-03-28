import { z } from "zod";

export const DownloadItemResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    completed: z.number(),
    message: z.string(),
});

export type DownloadItemResponse = z.infer<typeof DownloadItemResponseSchema>;
