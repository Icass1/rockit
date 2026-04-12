// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LatestVersionResponseSchema = z.object({
    version: z.string(),
    apkUrl: z.string(),
});

export type LatestVersionResponse = z.infer<typeof LatestVersionResponseSchema>;
