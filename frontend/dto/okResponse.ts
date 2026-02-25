import { z } from "zod";

export const OkResponseSchema = z.object({
    status: z.string(),
});

export type OkResponse = z.infer<typeof OkResponseSchema>;
