// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendActivityItemSchema = z.object({
    userPublicId: z.string(),
    username: z.string(),
    userImageUrl: z.string().nullable(),
    mediaPublicId: z.string(),
    mediaName: z.string(),
    mediaImageUrl: z.string().nullable(),
    listenedAt: z.string(),
});

export type FriendActivityItem = z.infer<typeof FriendActivityItemSchema>;
