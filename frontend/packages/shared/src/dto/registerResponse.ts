// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RegisterResponseSchema = z.object({
    userId: z.string(),
    sessionId: z.string().nullable(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
