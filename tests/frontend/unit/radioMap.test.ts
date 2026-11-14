import {
    locatedRadioStations,
    projectRadioLocation,
    RADIO_MAP_MAX_LATITUDE,
    RADIO_MAP_SIZE,
} from "@rockit/shared";
import { expect, it } from "vitest";
import { mapStation } from "../fixtures/radio";

it("maps real finite coordinates once, including the equator, without inventing positions", () => {
    const equator = {
        ...mapStation,
        publicId: "equator",
        geoLat: 0,
        geoLong: 0,
    };
    expect(
        locatedRadioStations([
            mapStation,
            mapStation,
            equator,
            { ...mapStation, publicId: "missing", geoLat: null },
            { ...mapStation, publicId: "bad-lat", geoLat: 91 },
            { ...mapStation, publicId: "bad-lon", geoLong: -181 },
            { ...mapStation, publicId: "infinite", geoLong: Infinity },
        ]).map((station) => station.publicId)
    ).toEqual([mapStation.publicId, "equator"]);
});

it("projects Mercator landmarks and clamps the poles to finite world edges", () => {
    expect(projectRadioLocation(0, 0)).toEqual({
        x: RADIO_MAP_SIZE / 2,
        y: RADIO_MAP_SIZE / 2,
    });
    expect(projectRadioLocation(0, 90).x).toBe((RADIO_MAP_SIZE * 3) / 4);
    expect(projectRadioLocation(RADIO_MAP_MAX_LATITUDE, 0).y).toBeCloseTo(0, 8);
    expect(projectRadioLocation(-RADIO_MAP_MAX_LATITUDE, 0).y).toBeCloseTo(
        RADIO_MAP_SIZE,
        8
    );
    expect(projectRadioLocation(90, 180).y).toBeCloseTo(0, 8);
    expect(projectRadioLocation(-90, -180).y).toBeCloseTo(RADIO_MAP_SIZE, 8);
    expect(projectRadioLocation(48.86, 2.35).y).toBeLessThan(
        projectRadioLocation(40.42, -3.7).y
    );
});
