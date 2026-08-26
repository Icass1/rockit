// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BookmarkResponseSchema } from "./bookmarkResponse";

export const BookmarkListResponseSchema = z.object({
    bookmarks: z.array(z.lazy(() => BookmarkResponseSchema)),
});

export type BookmarkListResponse = z.infer<typeof BookmarkListResponseSchema>;
