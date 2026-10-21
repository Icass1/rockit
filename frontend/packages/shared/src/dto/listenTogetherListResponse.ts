// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { ListenTogetherSessionResponseSchema } from "./listenTogetherSessionResponse";

export const ListenTogetherListResponseSchema = z.object({
    sessions: z.array(z.lazy(() => ListenTogetherSessionResponseSchema)),
});

export type ListenTogetherListResponse = z.infer<
    typeof ListenTogetherListResponseSchema
>;
