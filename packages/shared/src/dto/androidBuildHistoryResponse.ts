// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { AndroidBuildResponseSchema } from "./androidBuildResponse";

export const AndroidBuildHistoryResponseSchema = z.object({
    builds: z.array(z.lazy(() => AndroidBuildResponseSchema)),
    workflowUrl: z.string(),
    availability: z.union([z.literal("available"), z.literal("unavailable")]),
});

export type AndroidBuildHistoryResponse = z.infer<
    typeof AndroidBuildHistoryResponseSchema
>;
