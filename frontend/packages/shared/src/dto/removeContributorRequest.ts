// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const RemoveContributorRequestSchema = z.object({
    target_user_public_id: z.string(),
});

export type RemoveContributorRequest = z.infer<
    typeof RemoveContributorRequestSchema
>;
