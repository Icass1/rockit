// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { NotificationDestinationSchema } from "./notificationDestination";
import { NotificationReplacementSchema } from "./notificationReplacement";

export const NotificationResponseSchema = z.object({
    publicId: z.string(),
    eventKey: z.string(),
    vocabularyKey: z.string(),
    replacements: z.array(z.lazy(() => NotificationReplacementSchema)),
    dateAdded: z.iso.datetime(),
    readAt: z.iso.datetime().nullable(),
    destination: z.lazy(() => NotificationDestinationSchema).nullable(),
});

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
