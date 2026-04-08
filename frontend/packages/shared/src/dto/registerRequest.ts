import { z } from "zod";

export const RegisterRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    repeatPassword: z.string(),
    platform: z.enum(["WEB", "MOBILE"]),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
