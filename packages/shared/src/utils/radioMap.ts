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
