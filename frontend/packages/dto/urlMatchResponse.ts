import { z } from "zod";

export const UrlMatchResponseSchema = z.object({
    path: z.string().nullable(),
});

export type UrlMatchResponse = z.infer<typeof UrlMatchResponseSchema>;
