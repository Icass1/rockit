// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const AddContributorRequestSchema = z.object({
    userPublicId: z.string(),
    role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

export type AddContributorRequest = z.infer<typeof AddContributorRequestSchema>;
