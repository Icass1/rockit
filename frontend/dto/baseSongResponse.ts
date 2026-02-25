import { BaseSongAlbumResponseSchema } from "@/dto/baseSongAlbumResponse";
import { z } from "zod";

export const BaseSongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    album: z.lazy(() => BaseSongAlbumResponseSchema),
});

export type BaseSongResponse = z.infer<typeof BaseSongResponseSchema>;
