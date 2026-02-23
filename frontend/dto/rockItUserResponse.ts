import * as z from "zod";

export const RockItUserResponse = z.object({
    username: z.string(),
    image: z.string(),
    admin: z.boolean(),
});
export type RockItUserResponse = z.infer<typeof RockItUserResponse>;
