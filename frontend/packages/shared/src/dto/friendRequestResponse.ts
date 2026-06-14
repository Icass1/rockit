// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendRequestResponseSchema = z.object({
    publicId: z.string(),
    fromUserPublicId: z.string(),
    fromUsername: z.string(),
    fromUserImageUrl: z.string().nullable(),
    message: z.string().nullable(),
    status: z.enum(["PENDING", "ACCEPTED", "BLOCKED", "REJECTED"]),
    dateAdded: z.iso.datetime(),
});

export type FriendRequestResponse = z.infer<typeof FriendRequestResponseSchema>;
