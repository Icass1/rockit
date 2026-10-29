// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const OkResponseSchema = z.object({
    status: z.string().default("OK"),
});

export type OkResponse = z.infer<typeof OkResponseSchema>;
