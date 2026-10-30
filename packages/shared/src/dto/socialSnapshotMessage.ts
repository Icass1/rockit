// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { FriendResponseSchema } from './friendResponse';
import { FriendActivityItemSchema } from './friendActivityItem';
import { FriendRequestResponseSchema } from './friendRequestResponse';

export const SocialSnapshotMessageSchema = z.object({
    type: z.union([z.literal("social_changed")]).default("social_changed"),
    friends: z.array(z.lazy(() => FriendResponseSchema)),
    incoming: z.array(z.lazy(() => FriendRequestResponseSchema)),
    sent: z.array(z.lazy(() => FriendRequestResponseSchema)),
    activities: z.array(z.lazy(() => FriendActivityItemSchema)),
});

export type SocialSnapshotMessage = z.infer<typeof SocialSnapshotMessageSchema>;