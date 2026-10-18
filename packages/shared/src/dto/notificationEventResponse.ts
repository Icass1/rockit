// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationEventResponseSchema = z.object({
    key: z.union([
        z.literal("APPLICATION_MESSAGE"),
        z.literal("DOWNLOAD_COMPLETED"),
        z.literal("DOWNLOAD_FAILED"),
        z.literal("BUILD_PUBLISHED"),
    ]),
    vocabularyKey: z.string(),
});

export type NotificationEventResponse = z.infer<
    typeof NotificationEventResponseSchema
>;
