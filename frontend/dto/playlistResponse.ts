import {
    PlaylistContributorResponseSchema,
    PlaylistMediaResponseSchema,
} from "@/dto";
import { z } from "zod";

export const PlaylistResponseSchema = z.object({
    id: z.number(),
    public_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    cover_image: z.string(),
    is_public: z.boolean(),
    owner_id: z.number(),
    date_added: z.string(),
    date_updated: z.string(),
    medias: z.array(z.lazy(() => PlaylistMediaResponseSchema)),
    contributors: z.array(z.lazy(() => PlaylistContributorResponseSchema)),
});

export type PlaylistResponse = z.infer<typeof PlaylistResponseSchema>;
