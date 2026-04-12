// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UrlMatchResponseSchema = z.object({
    path: z.string().nullable(),
});

export type UrlMatchResponse = z.infer<typeof UrlMatchResponseSchema>;
