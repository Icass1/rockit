// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LoginResponseSchema = z.object({
    userId: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
