// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListenTogetherJoinRequestSchema = z.object({
    sessionPublicId: z.string(),
});

export type ListenTogetherJoinRequest = z.infer<
    typeof ListenTogetherJoinRequestSchema
>;
