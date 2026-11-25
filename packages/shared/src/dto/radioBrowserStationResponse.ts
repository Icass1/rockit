// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const RadioBrowserStationResponseSchema = z.object({
    stationuuid: z.string(),
    name: z.string(),
    url: z.string(),
    url_resolved: z.string().nullable().default(null),
    favicon: z.string(),
    homepage: z.string().nullable().default(null),
    country: z.string().nullable().default(null),
    countrycode: z.string().nullable().default(null),
    state: z.string().nullable().default(null),
    language: z.string().nullable().default(null),
    languagecodes: z.string().nullable().default(null),
    codec: z.string().nullable().default(null),
    bitrate: z.number().nullable().default(null),
    tags: z.string().nullable().default(null),
    votes: z.number().nullable().default(null),
    geo_lat: z.number().nullable().default(null),
    geo_long: z.number().nullable().default(null),
});

export type RadioBrowserStationResponse = z.infer<
    typeof RadioBrowserStationResponseSchema
>;
