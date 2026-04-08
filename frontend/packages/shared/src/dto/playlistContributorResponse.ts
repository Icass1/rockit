import { z } from "zod";

export const PlaylistContributorResponseSchema = z.object({
    user_id: z.number(),
    role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

export type PlaylistContributorResponse = z.infer<
    typeof PlaylistContributorResponseSchema
>;
