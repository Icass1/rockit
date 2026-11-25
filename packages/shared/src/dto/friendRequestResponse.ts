// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendRequestResponseSchema = z.object({
    publicId: z.string(),
    fromUserPublicId: z.string(),
    fromUsername: z.string(),
    fromUserImageUrl: z.string().nullable().default(null),
    message: z.string().nullable().default(null),
    status: z.union([
        z.literal("pending"),
        z.literal("accepted"),
        z.literal("blocked"),
        z.literal("rejected"),
    ]),
    dateAdded: z.iso.datetime(),
});

export type FriendRequestResponse = z.infer<typeof FriendRequestResponseSchema>;
