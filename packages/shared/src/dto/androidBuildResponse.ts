// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const AndroidBuildResponseSchema = z.object({
    runId: z.number(),
    number: z.number(),
    branch: z.string(),
    commit: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
    createdAt: z.iso.datetime(),
    url: z.string(),
    artifactUrl: z.string().nullable(),
    expiresAt: z.iso.datetime().nullable(),
    expired: z.boolean(),
});

export type AndroidBuildResponse = z.infer<typeof AndroidBuildResponseSchema>;
