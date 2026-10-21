// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { UserSearchResultSchema } from "./userSearchResult";

export const FriendSearchResponseSchema = z.object({
    results: z.array(z.lazy(() => UserSearchResultSchema)),
});

export type FriendSearchResponse = z.infer<typeof FriendSearchResponseSchema>;
