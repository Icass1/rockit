import { z } from "zod";

export const DownloadProgressMessageSchema = z.object({
    type: z.string(),
    download_id: z.number(),
    public_id: z.string(),
    status: z.string(),
    progress: z.number(),
    message: z.string(),
});

export type DownloadProgressMessage = z.infer<
    typeof DownloadProgressMessageSchema
>;
