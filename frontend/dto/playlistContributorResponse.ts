import { z } from "zod";

export const PlaylistContributorResponseSchema = z.object({
    user_id: z.number(),
    role_key: z.number(),
});

export type PlaylistContributorResponse = z.infer<
    typeof PlaylistContributorResponseSchema
>;
