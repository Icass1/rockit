// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const LibrarySongSortSchema = z.union([
    z.literal("relevance"),
    z.literal("name_asc"),
    z.literal("name_desc"),
    z.literal("recent"),
]);

export type LibrarySongSort = z.infer<typeof LibrarySongSortSchema>;
