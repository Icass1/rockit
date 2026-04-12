// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LoginRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    platform: z.enum(["WEB", "MOBILE"]),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
