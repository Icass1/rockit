// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UserSearchResultSchema = z.object({
    publicId: z.string(),
    username: z.string(),
    imageUrl: z.string().nullable(),
    isFriend: z.boolean().default(false),
    requestSent: z.boolean().default(false),
});

export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;
