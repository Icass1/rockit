// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const GetBookmarksRequestSchema = z.object({
    mediaPublicId: z.string().nullable(),
});

export type GetBookmarksRequest = z.infer<typeof GetBookmarksRequestSchema>;
