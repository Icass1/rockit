// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LatestAndroidApkResponseSchema } from "./latestAndroidApkResponse";

export const LatestAndroidReleaseResponseSchema = z.object({
    apk: z.lazy(() => LatestAndroidApkResponseSchema).nullable(),
});

export type LatestAndroidReleaseResponse = z.infer<
    typeof LatestAndroidReleaseResponseSchema
>;
