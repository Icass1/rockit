// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListenTogetherLeaveRequestSchema = z.object({
    sessionPublicId: z.string(),
});

export type ListenTogetherLeaveRequest = z.infer<
    typeof ListenTogetherLeaveRequestSchema
>;
