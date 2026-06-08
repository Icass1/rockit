// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RadioBrowserStationResponseSchema = z.object({
    stationuuid: z.string(),
    name: z.string(),
    url: z.string(),
    url_resolved: z.string().nullable(),
    favicon: z.string(),
    homepage: z.string().nullable(),
    country: z.string().nullable(),
    countrycode: z.string().nullable(),
    state: z.string().nullable(),
    language: z.string().nullable(),
    languagecodes: z.string().nullable(),
    codec: z.string().nullable(),
    bitrate: z.number().nullable(),
    tags: z.string().nullable(),
    votes: z.number().nullable(),
    geo_lat: z.number().nullable(),
    geo_long: z.number().nullable(),
});

export type RadioBrowserStationResponse = z.infer<
    typeof RadioBrowserStationResponseSchema
>;
