// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { FriendResponseSchema } from "./friendResponse";

export const FriendListResponseSchema = z.object({
    friends: z.array(z.lazy(() => FriendResponseSchema)),
});

export type FriendListResponse = z.infer<typeof FriendListResponseSchema>;
