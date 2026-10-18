// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SearchRequestSchema = z.object({
    query: z.string(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
