// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendsPresenceChangedMessageSchema = z.object({
    type: z
        .union([z.literal("friends_presence_changed")])
        .default("friends_presence_changed"),
    userPublicId: z.string().nullable().default(null),
    isOnline: z.boolean().default(false),
    nowPlaying: z.string().nullable().default(null),
});

export type FriendsPresenceChangedMessage = z.infer<
    typeof FriendsPresenceChangedMessageSchema
>;
