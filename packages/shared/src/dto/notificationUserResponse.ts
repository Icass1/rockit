// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationUserResponseSchema = z.object({
    publicId: z.string(),
    username: z.string(),
});

export type NotificationUserResponse = z.infer<
    typeof NotificationUserResponseSchema
>;
