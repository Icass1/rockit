import { z } from "zod";

export const DownloadItemResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    subtitle: z.string().nullable(),
    imageUrl: z.string().nullable(),
    completed: z.number(),
    message: z.string(),
});

export type DownloadItemResponse = z.infer<typeof DownloadItemResponseSchema>;
