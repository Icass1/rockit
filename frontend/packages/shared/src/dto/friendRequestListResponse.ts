// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { FriendRequestResponseSchema } from "./friendRequestResponse";

export const FriendRequestListResponseSchema = z.object({
    incoming: z.array(z.lazy(() => FriendRequestResponseSchema)),
    sent: z.array(z.lazy(() => FriendRequestResponseSchema)),
});

export type FriendRequestListResponse = z.infer<
    typeof FriendRequestListResponseSchema
>;
