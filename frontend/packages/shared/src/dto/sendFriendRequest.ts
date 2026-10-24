// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SendFriendRequestSchema = z.object({
    userPublicId: z.string(),
    message: z.string().nullable(),
});

export type SendFriendRequest = z.infer<typeof SendFriendRequestSchema>;
