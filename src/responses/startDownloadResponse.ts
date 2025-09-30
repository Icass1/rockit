import * as z from "zod";

export const StartDownloadResponse = z.object({
    downloadId: z.string(),
});

export type StartDownloadResponse = z.infer<typeof StartDownloadResponse>;
