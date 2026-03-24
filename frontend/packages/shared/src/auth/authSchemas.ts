import { z } from "zod";

export const LoginRequestSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

export const RegisterRequestSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_-]+$/),
    password: z.string().min(1),
    repeatPassword: z.string().min(1),
});

export const SessionResponseSchema = z.object({
    username: z.string(),
    image: z.string(),
    admin: z.boolean(),
    queueType: z.any(),
    currentTimeMs: z.number().nullable(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
