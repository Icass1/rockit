import * as z from "zod";

export const DownloadStatusMessage = z.object({
    id: z.string(),
    completed: z.number(),
    message: z.string(),
    total: z.number().optional(),
});

export type DownloadStatusMessage = z.infer<typeof DownloadStatusMessage>;
