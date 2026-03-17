import { z } from "zod";

export const RemoveContributorRequestSchema = z.object({
    target_user_public_id: z.string(),
});

export type RemoveContributorRequest = z.infer<
    typeof RemoveContributorRequestSchema
>;
