import { z } from 'zod';

export const StartDownloadResponseSchema = z.object({
    downloadGroupId: z.string(),
});

export type StartDownloadResponse = z.infer<typeof StartDownloadResponseSchema>;