import { z } from "zod";

export const OkResponseSchema = z.object({
    status: z.string().default("OK"),
});

export type OkResponse = z.infer<typeof OkResponseSchema>;
