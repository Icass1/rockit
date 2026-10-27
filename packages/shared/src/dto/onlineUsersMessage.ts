// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const OnlineUsersMessageSchema = z.object({
    type: z.union([z.literal("online_users")]).default("online_users"),
    count: z.number(),
});

export type OnlineUsersMessage = z.infer<typeof OnlineUsersMessageSchema>;
