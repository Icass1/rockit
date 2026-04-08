import { z } from "zod";

export const AddContributorRequestSchema = z.object({
    user_public_id: z.string(),
    role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

export type AddContributorRequest = z.infer<typeof AddContributorRequestSchema>;
