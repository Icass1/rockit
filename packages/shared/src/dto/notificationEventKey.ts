// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationEventKeySchema = z.union([
    z.literal("APPLICATION_MESSAGE"),
    z.literal("DOWNLOAD_COMPLETED"),
    z.literal("DOWNLOAD_FAILED"),
    z.literal("BUILD_PUBLISHED"),
]);

export type NotificationEventKey = z.infer<typeof NotificationEventKeySchema>;
