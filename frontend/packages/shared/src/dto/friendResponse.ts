// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendResponseSchema = z.object({
    publicId: z.string(),
    username: z.string(),
    imageUrl: z.string().nullable(),
    status: z.string(),
    isOnline: z.boolean().default(false),
    nowPlaying: z.string().nullable(),
    level: z.number().default(1),
    levelTitle: z.string().nullable(),
    dateAdded: z.iso.datetime(),
});

export type FriendResponse = z.infer<typeof FriendResponseSchema>;
