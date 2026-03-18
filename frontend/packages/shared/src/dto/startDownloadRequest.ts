import { z } from "zod";

export const StartDownloadRequestSchema = z.object({
    ids: z.array(z.string()),
    title: z.string(),
});

export type StartDownloadRequest = z.infer<typeof StartDownloadRequestSchema>;
