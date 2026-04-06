import { z } from "zod";

export const DownloadProgressMessageSchema = z.object({
    type: z.union([z.literal("download_progress")]),
    download_id: z.number(),
    publicId: z.string(),
    title: z.string(),
    subTitle: z.string(),
    status: z.string(),
    progress: z.number(),
    message: z.string(),
});

export type DownloadProgressMessage = z.infer<
    typeof DownloadProgressMessageSchema
>;
