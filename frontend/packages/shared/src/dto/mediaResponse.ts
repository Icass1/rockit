import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const MediaResponseSchema = z.union([
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
]);

export type MediaResponse = z.infer<typeof MediaResponseSchema>;
