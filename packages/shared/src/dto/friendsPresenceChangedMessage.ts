// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendsPresenceChangedMessageSchema = z.object({
    type: z
        .union([z.literal("friends_presence_changed")])
        .default("friends_presence_changed"),
});

export type FriendsPresenceChangedMessage = z.infer<
    typeof FriendsPresenceChangedMessageSchema
>;
