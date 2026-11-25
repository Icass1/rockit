// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const AndroidBuildShareResponseSchema = z.object({
    url: z.string(),
});

export type AndroidBuildShareResponse = z.infer<
    typeof AndroidBuildShareResponseSchema
>;
