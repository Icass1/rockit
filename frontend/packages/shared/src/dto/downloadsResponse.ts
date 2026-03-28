import { z } from "zod";
import { DownloadGroupResponseSchema } from "./downloadGroupResponse";

export const DownloadsResponseSchema = z.object({
    downloads: z.array(z.lazy(() => DownloadGroupResponseSchema)),
});

export type DownloadsResponse = z.infer<typeof DownloadsResponseSchema>;
