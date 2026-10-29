// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationEventResponseSchema = z.object({
    key: z.union([
        z.literal("APPLICATION_MESSAGE"),
        z.literal("DOWNLOAD_COMPLETED"),
        z.literal("DOWNLOAD_FAILED"),
        z.literal("IMPORT_COMPLETED"),
        z.literal("IMPORT_FAILED"),
        z.literal("FRIEND_REQUEST"),
        z.literal("MEDIA_SHARED"),
        z.literal("ZIP_READY"),
    ]),
    vocabularyKey: z.string(),
});

export type NotificationEventResponse = z.infer<
    typeof NotificationEventResponseSchema
>;
