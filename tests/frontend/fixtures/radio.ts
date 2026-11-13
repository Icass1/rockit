import type { BaseStationResponse } from "@rockit/shared";

export const mapStation: BaseStationResponse = {
    type: "station",
    provider: "RadioBrowser",
    publicId: "map-france",
    providerUrl: "https://fixture.invalid/map-france",
    name: "Paris fixture radio",
    imageUrl: "http://127.0.0.1:18899/assets/album.svg",
    streamUrl: "http://127.0.0.1:18899/assets/silence.wav",
    country: "France",
    countryCode: "FR",
    codec: "MP3",
    bitrate: 128,
    tags: "jazz",
    homepage: null,
    geoLat: 48.86,
    geoLong: 2.35,
};
