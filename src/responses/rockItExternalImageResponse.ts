import * as z from "zod";

export const RockItExternalImageResponse = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});
