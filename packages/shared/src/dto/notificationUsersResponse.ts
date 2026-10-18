// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { NotificationUserResponseSchema } from "./notificationUserResponse";

export const NotificationUsersResponseSchema = z.object({
    users: z.array(z.lazy(() => NotificationUserResponseSchema)),
});

export type NotificationUsersResponse = z.infer<
    typeof NotificationUsersResponseSchema
>;
