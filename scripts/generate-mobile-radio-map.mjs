// Derive a compact offline map from world-atlas (Natural Earth public-domain geometry).
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
    new URL("../apps/web/package.json", import.meta.url)
);
const { feature } = require("topojson-client");
const topology = require("world-atlas/countries-110m.json");
const countries = feature(topology, topology.objects.countries).features.map(
    (country) => {
        const polygons =
            country.geometry.type === "Polygon"
                ? [country.geometry.coordinates]
                : country.geometry.coordinates;
        const d = polygons
            .flatMap((polygon) =>
                polygon.map(
                    (ring) =>
                        ring
                            .map(
                                ([lon, lat], index) =>
                                    `${index ? "L" : "M"}${((lon + 180) * 2).toFixed(1)},${((90 - lat) * 2).toFixed(1)}`
                            )
                            .join("") + "Z"
                )
            )
            .join("");
        return { id: country.id, name: country.properties.name, d };
    }
);
await writeFile(
    new URL("../apps/mobile/assets/data/radio-world.json", import.meta.url),
    JSON.stringify(countries)
);
