// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LoginRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    platform: z.enum(["WEB", "MOBILE"]),
    rememberMe: z.boolean(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
