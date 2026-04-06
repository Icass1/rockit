import { z } from "zod";

export const DownloadProgressMessageSchema = z.object({
    type: z.union([z.literal("download_progress")]),
    download_id: z.number(),
    publicId: z.string(),
    title: z.string(),
    subTitle: z.string(),
    status: z.union([
        z.literal("converting"),
        z.literal("completed"),
        z.literal("downloading"),
        z.literal("error"),
        z.literal("starting"),
    ]),
    progress: z.number(),
    message: z.string(),
});

export type DownloadProgressMessage = z.infer<
    typeof DownloadProgressMessageSchema
>;
