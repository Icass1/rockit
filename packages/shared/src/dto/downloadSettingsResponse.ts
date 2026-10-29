// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const DownloadSettingsResponseSchema = z.object({
    autoAddToLibrary: z.boolean(),
});

export type DownloadSettingsResponse = z.infer<
    typeof DownloadSettingsResponseSchema
>;
