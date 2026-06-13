// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { FriendActivityItemSchema } from "./friendActivityItem";

export const FriendActivityResponseSchema = z.object({
    activities: z.array(z.lazy(() => FriendActivityItemSchema)),
});

export type FriendActivityResponse = z.infer<
    typeof FriendActivityResponseSchema
>;
