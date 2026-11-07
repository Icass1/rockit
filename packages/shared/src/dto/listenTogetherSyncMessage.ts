// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { ListenTogetherSessionResponseSchema } from "./listenTogetherSessionResponse";

export const ListenTogetherSyncMessageSchema = z.object({
    sessions: z.array(z.lazy(() => ListenTogetherSessionResponseSchema)),
    type: z
        .union([z.literal("listen_together_sync")])
        .default("listen_together_sync"),
});

export type ListenTogetherSyncMessage = z.infer<
    typeof ListenTogetherSyncMessageSchema
>;
