import { locatedRadioStations } from "@rockit/shared";
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
