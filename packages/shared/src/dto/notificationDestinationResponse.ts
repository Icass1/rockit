// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationDestinationResponseSchema = z.object({
    url: z.string(),
    newTab: z.boolean(),
});

export type NotificationDestinationResponse = z.infer<
    typeof NotificationDestinationResponseSchema
>;
