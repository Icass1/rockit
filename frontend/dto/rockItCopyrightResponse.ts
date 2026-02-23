import * as z from "zod";

export const RockItCopyrightResponse = z.object({
    text: z.string(),
    type: z.string(),
});
