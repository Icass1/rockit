// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { SharedMediaItemSchema } from "./sharedMediaItem";

export const SharedMediaSentResponseSchema = z.object({
    items: z.array(z.lazy(() => SharedMediaItemSchema)),
});

export type SharedMediaSentResponse = z.infer<
    typeof SharedMediaSentResponseSchema
>;
