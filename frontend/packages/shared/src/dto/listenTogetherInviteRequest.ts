// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListenTogetherInviteRequestSchema = z.object({
    userPublicId: z.string(),
});

export type ListenTogetherInviteRequest = z.infer<
    typeof ListenTogetherInviteRequestSchema
>;
