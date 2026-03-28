import { z } from "zod";
import { DownloadItemResponseSchema } from "./downloadItemResponse";

export const DownloadGroupResponseSchema = z.object({
    publicId: z.string(),
    title: z.string(),
    dateStarted: z.string(),
    success: z.number(),
    fail: z.number(),
    items: z.array(z.lazy(() => DownloadItemResponseSchema)),
});

export type DownloadGroupResponse = z.infer<typeof DownloadGroupResponseSchema>;
