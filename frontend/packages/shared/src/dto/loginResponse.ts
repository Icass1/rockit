// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LoginResponseSchema = z.object({
    userId: z.string(),
    sessionId: z.string().nullable(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
