import { z } from "zod";

export const LikeMediaRequestSchema = z.object({
    publicIds: z.array(z.string()),
});

export type LikeMediaRequest = z.infer<typeof LikeMediaRequestSchema>;
