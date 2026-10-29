// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ArtistImageSourceSchema = z.object({
    provider: z.string(),
    externalId: z.string(),
});

export type ArtistImageSource = z.infer<typeof ArtistImageSourceSchema>;
