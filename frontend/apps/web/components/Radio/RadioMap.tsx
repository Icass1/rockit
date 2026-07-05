"use client";

import { useEffect, useMemo, useRef, type JSX } from "react";
import type { Feature, FeatureCollection, Position } from "geojson";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import "leaflet/dist/leaflet.css";

interface RadioMapProps {
    onCountryClick: (countryName: string) => void;
    selectedCountry: string | null;
}

interface CountryProperties {
    name: string;
    [key: string]: unknown;
}

const WORLD_BOUNDS = L.latLngBounds([-90, -180], [90, 180]);

function MapBounds(): null {
    const map = useMap();
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            map.setMaxBounds(WORLD_BOUNDS);
            initialized.current = true;
        }
    }, [map]);

    return null;
}

/* ── Antimeridian splitting ───────────────────────────── */

function crossesMeridian(lon1: number, lon2: number): boolean {
    return Math.abs(lon2 - lon1) > 180;
}

interface CrossPt {
    segIdx: number;
    pos: Position;
    side: number;
}

function buildCrossings(ring: Position[]): CrossPt[] {
    const n = ring.length;
    const out: CrossPt[] = [];
    const isMeridian = (v: number): boolean =>
        Math.abs(Math.abs(v) - 180) < 1e-8;
    for (let i = 0; i < n; i++) {
        const curr = ring[i];
        const next = ring[(i + 1) % n];
        const cLon = curr[0];
        const nLon = next[0];

        if (crossesMeridian(cLon, nLon)) {
            const diff = nLon - cLon;
            const shortDiff =
                diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
            if (Math.abs(shortDiff) < 1e-10) continue;
            const side = shortDiff > 0 ? 180 : -180;
            const t = (side - cLon) / shortDiff;
            out.push({
                segIdx: i,
                pos: [side, curr[1] + t * (next[1] - curr[1])],
                side,
            });
            continue;
        }

        if (isMeridian(cLon) && !isMeridian(nLon)) {
            out.push({
                segIdx: i,
                pos: [cLon, curr[1]],
                side: cLon > 0 ? 180 : -180,
            });
            continue;
        }

        if (!isMeridian(cLon) && isMeridian(nLon)) {
            out.push({
                segIdx: i,
                pos: [nLon, next[1]],
                side: nLon > 0 ? 180 : -180,
            });
            continue;
        }
    }
    return out;
}

function splitRing(ring: Position[]): Position[][] {
    if (ring.length < 3) return [ring];
    const cp = buildCrossings(ring);
    if (cp.length === 0) return [ring];
    if (cp.length % 2 !== 0 || cp.length > 12) return [ring];
    const n = ring.length;
    const parts: Position[][] = [];
    for (let ci = 0; ci < cp.length; ci++) {
        const enter = cp[ci];
        const exit = cp[(ci + 1) % cp.length];
        const sideLon = ring[(enter.segIdx + 1) % n][0] > 0 ? 180 : -180;
        const part: Position[] = [];
        part.push([sideLon, enter.pos[1]]);
        let i = (enter.segIdx + 1) % n;
        while (i !== (exit.segIdx + 1) % n) {
            part.push(ring[i % n]);
            i = (i + 1) % n;
        }
        part.push([sideLon, exit.pos[1]]);
        part.push([sideLon, enter.pos[1]]);
        if (part.length < 4) continue;
        const pLons = part.map((p) => p[0]);
        const pMin = Math.min(...pLons);
        const pMax = Math.max(...pLons);
        if (pMax - pMin > 0.01 && pMax - pMin < 300) parts.push(part);
    }
    return parts;
}

function splitPolygon(coords: Position[][]): Position[][][] {
    const outer = splitRing(coords[0]);
    const holes = coords.slice(1).flatMap((r) => splitRing(r));
    const result: Position[][][] = [];
    for (const o of outer) {
        result.push([o, ...holes]);
    }
    return result;
}

function splitFeatureAtAntimeridian(feature: Feature): Feature[] {
    if (!feature.geometry) return [feature];
    const props = feature.properties;
    if (feature.geometry.type === "Polygon") {
        return splitPolygon(feature.geometry.coordinates).map((coords) => ({
            type: "Feature" as const,
            properties: props,
            geometry: { type: "Polygon" as const, coordinates: coords },
        }));
    }
    if (feature.geometry.type === "MultiPolygon") {
        const out: Feature[] = [];
        for (const poly of feature.geometry.coordinates) {
            const split = splitPolygon(poly);
            for (const coords of split) {
                out.push({
                    type: "Feature" as const,
                    properties: props,
                    geometry: { type: "Polygon" as const, coordinates: coords },
                });
            }
        }
        return out;
    }
    return [feature];
}

function splitCollection(collection: FeatureCollection): FeatureCollection {
    return {
        type: "FeatureCollection",
        features: collection.features.flatMap(splitFeatureAtAntimeridian),
    };
}

/* ── Map styles ────────────────────────────────────────── */

function getCountryStyle(
    selected: string | null
): (f: GeoJSON.Feature | undefined) => L.PathOptions {
    return (f: GeoJSON.Feature | undefined): L.PathOptions => {
        const props = f?.properties as CountryProperties | undefined;
        const isSelected = props?.name === selected;

        return {
            fillColor: isSelected ? "#ee1086" : "transparent",
            fillOpacity: isSelected ? 0.3 : 0,
            color: isSelected ? "#ee1086" : "rgba(255, 255, 255, 0.15)",
            weight: isSelected ? 2 : 0.5,
            opacity: 1,
        };
    };
}

function onEachCountryFeature(
    onCountryClick: (name: string) => void
): (f: GeoJSON.Feature, layer: L.GeoJSON) => void {
    return (f: GeoJSON.Feature, layer: L.GeoJSON): void => {
        const name = (f.properties as CountryProperties | undefined)?.name;
        if (!name) return;

        layer.on({
            click: () => {
                onCountryClick(name);
            },
            mouseover: (e: L.LeafletMouseEvent) => {
                const target = e.target as L.Path;
                target.setStyle({
                    fillColor: "#ee1086",
                    fillOpacity: 0.15,
                    color: "#ee1086",
                    weight: 1,
                });
                target.bindTooltip(name, {
                    direction: "center",
                    className: "radio-country-tooltip",
                    sticky: true,
                });
                target.openTooltip(e.latlng);
            },
            mouseout: (e: L.LeafletMouseEvent) => {
                const target = e.target as L.Path;
                target.setStyle({
                    fillOpacity: 0,
                    weight: 0.5,
                    color: "rgba(255, 255, 255, 0.15)",
                    fillColor: "transparent",
                });
                target.closeTooltip();
            },
        });
    };
}

/* ── Component ─────────────────────────────────────────── */

export default function RadioMap({
    onCountryClick,
    selectedCountry,
}: RadioMapProps): JSX.Element {
    const countries: FeatureCollection | null = useMemo(() => {
        try {
            const topology = worldData as unknown as Topology;
            if (topology.objects?.countries) {
                const geojson = feature(
                    topology,
                    topology.objects.countries
                ) as unknown as FeatureCollection;
                return splitCollection(geojson);
            }
        } catch (e) {
            console.error("Failed to load world data:", e);
        }
        return null;
    }, []);

    return (
        <div className="radio-map-container w-full overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)]">
            <MapContainer
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                maxZoom={6}
                zoomControl={false}
                attributionControl={false}
                dragging={true}
                scrollWheelZoom={true}
                doubleClickZoom={false}
                className="h-75 w-full md:h-100"
            >
                <MapBounds />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    tileSize={512}
                    zoomOffset={-1}
                />
                {countries && (
                    <GeoJSON
                        key={selectedCountry ?? "default"}
                        data={countries}
                        style={getCountryStyle(selectedCountry)}
                        onEachFeature={onEachCountryFeature(onCountryClick)}
                    />
                )}
            </MapContainer>
        </div>
    );
}
