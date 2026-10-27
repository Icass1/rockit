// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LegacyNotificationRequestSchema } from "./legacyNotificationRequest";

export const LegacyNotificationsRequestSchema = z.object({
    items: z.array(z.lazy(() => LegacyNotificationRequestSchema)),
});

export type LegacyNotificationsRequest = z.infer<
    typeof LegacyNotificationsRequestSchema
>;
