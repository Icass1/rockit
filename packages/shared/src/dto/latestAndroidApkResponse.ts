// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const LatestAndroidApkResponseSchema = z.object({
    buildNumber: z.number(),
    versionCode: z.number().nullable(),
    apkUrl: z.string(),
});

export type LatestAndroidApkResponse = z.infer<
    typeof LatestAndroidApkResponseSchema
>;
