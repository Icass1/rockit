import { z } from "zod";

export const UpdateCrossfadeRequestSchema = z.object({
    crossfade: z.number(),
});

export type UpdateCrossfadeRequest = z.infer<
    typeof UpdateCrossfadeRequestSchema
>;
