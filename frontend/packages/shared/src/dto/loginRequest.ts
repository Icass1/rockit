import { z } from "zod";

export const LoginRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    platform: z.enum(["WEB", "MOBILE"]),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
