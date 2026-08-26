// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistContributorSchema = z.object({
    userPublicId: z.string(),
    username: z.string(),
    role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

export type PlaylistContributor = z.infer<typeof PlaylistContributorSchema>;
