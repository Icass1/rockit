// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationDestinationSchema = z.object({
    path: z.string(),
});

export type NotificationDestination = z.infer<
    typeof NotificationDestinationSchema
>;
