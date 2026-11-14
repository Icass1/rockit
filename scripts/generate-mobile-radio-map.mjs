import { RADIO_MAP_SIZE } from "../packages/shared/src/utils/radioMap.ts";
import { geoMercator, geoPath } from "d3-geo";
// Derive a compact offline map from world-atlas (Natural Earth public-domain geometry).
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
    new URL("../apps/web/package.json", import.meta.url)
);
const { feature } = require("topojson-client");
const topology = require("world-atlas/countries-110m.json");
// d3's geographic stream clips rings at the antimeridian before projection.
const projection = geoMercator().scale(RADIO_MAP_SIZE / (2 * Math.PI)).translate([RADIO_MAP_SIZE / 2, RADIO_MAP_SIZE / 2]).clipExtent([[0, 0], [RADIO_MAP_SIZE, RADIO_MAP_SIZE]]);
const path = geoPath(projection).digits(1);
const countries = feature(topology, topology.objects.countries).features.map(country => ({
    id: country.id, name: country.properties.name, d: path(country),
}));
await writeFile(new URL("../apps/mobile/assets/data/radio-world.json", import.meta.url), JSON.stringify(countries));
