import type { BaseStationResponse } from "@/dto";

/** Share location validation and deduplication; never invent a station's position. */
export function locatedRadioStations(
    stations: readonly BaseStationResponse[]
): BaseStationResponse[] {
    return [
        ...new Map(
            stations
                .filter(
                    (station) =>
                        station.geoLat != null &&
                        station.geoLong != null &&
                        Number.isFinite(station.geoLat) &&
                        Number.isFinite(station.geoLong) &&
                        Math.abs(station.geoLat) <= 90 &&
                        Math.abs(station.geoLong) <= 180
                )
                .map((station) => [station.publicId, station])
        ).values(),
    ];
}

/** Square Web Mercator world, matching standard map navigation. */
export const RADIO_MAP_SIZE = 720;
export const RADIO_MAP_MAX_LATITUDE =
    (Math.atan(Math.sinh(Math.PI)) * 180) / Math.PI;

export function projectRadioLocation(
    latitude: number,
    longitude: number
): { x: number; y: number } {
    const lat = Math.max(
        -RADIO_MAP_MAX_LATITUDE,
        Math.min(RADIO_MAP_MAX_LATITUDE, latitude)
    );
    const radians = (lat * Math.PI) / 180;
    return {
        x: ((longitude + 180) / 360) * RADIO_MAP_SIZE,
        y:
            ((1 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) /
                2) *
            RADIO_MAP_SIZE,
    };
}
