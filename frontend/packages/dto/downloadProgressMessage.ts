import { z } from "zod";

export const DownloadProgressMessageSchema = z.object({
    type: z.string().default("download_progress"),
    download_id: z.number(),
    status: z.string(),
    progress: z.number(),
    message: z.string(),
});

export type DownloadProgressMessage = z.infer<
    typeof DownloadProgressMessageSchema
>;
