// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistContributorResponseSchema = z.object({
    user_id: z.number(),
    role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

export type PlaylistContributorResponse = z.infer<
    typeof PlaylistContributorResponseSchema
>;
