import { z } from "zod";

export const PlaylistContributorResponseSchema = z.object({
    user_id: z.number(),
    role: z.any(),
});

export type PlaylistContributorResponse = z.infer<
    typeof PlaylistContributorResponseSchema
>;
