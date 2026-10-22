"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { Feature, FeatureCollection, Position } from "geojson";
import L from "leaflet";
import {
    CircleMarker,
    GeoJSON,
    MapContainer,
    Popup,
    Tooltip,
    useMap,
    ZoomControl,
} from "react-leaflet";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import "leaflet/dist/leaflet.css";
import { useStore } from "@nanostores/react";
import type { BaseStationResponse } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

interface RadioMapProps {
    onCountryClick: (countryName: string) => void;
    selectedCountry: string | null;
    savedStations?: BaseStationResponse[];
}

interface CountryProperties {
    name: string;
    [key: string]: unknown;
}

const WORLD_BOUNDS = L.latLngBounds([-85, -Infinity], [85, Infinity]);

function MapBounds({
    selectedCountry,
    countries,
    onWorldRadiusChange,
}: {
    selectedCountry: string | null;
    countries: FeatureCollection | null;
    onWorldRadiusChange: (radius: number) => void;
}): null {
    const map = useMap();
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            map.setMaxBounds(WORLD_BOUNDS);
            initialized.current = true;
        }
    }, [map]);

    useEffect(() => {
        const updateWorlds = (): void => {
            const worldWidth = map
                .getPixelWorldBounds(map.getMinZoom())
                .getSize().x;
            onWorldRadiusChange(
                Math.ceil(map.getSize().x / (2 * worldWidth)) + 1
            );
        };
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
            updateWorlds();
        });
        updateWorlds();
        observer.observe(map.getContainer());
        return (): void => {
            observer.disconnect();
        };
    }, [map, onWorldRadiusChange]);

    useEffect(() => {
        if (!selectedCountry || !countries) return;
        const selected = countries.features.filter(
            (country) => country.properties?.name === selectedCountry
        );
        const bounds = L.geoJSON(selected).getBounds();
        if (!bounds.isValid()) return;
        const size = map.getSize();
        map.fitBounds(bounds, {
            maxZoom: 4,
            animate: false,
            paddingTopLeft:
                size.x >= 768 && size.y >= 404 ? [420, 128] : [24, 180],
            paddingBottomRight: size.x >= 768 ? [32, 32] : [24, size.y * 0.45],
        });
    }, [map, selectedCountry, countries]);

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
            fillColor: isSelected ? "#ee1086" : "#27272a",
            fillOpacity: isSelected ? 0.6 : 1,
            color: isSelected ? "#ee1086" : "rgba(255, 255, 255, 0.15)",
            weight: isSelected ? 2 : 0.5,
            opacity: 1,
        };
    };
}

function onEachCountryFeature(
    onCountryClick: (name: string) => void,
    selectedCountry: string | null
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
                    ...getCountryStyle(selectedCountry)(f),
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
    savedStations = [],
}: RadioMapProps): JSX.Element {
    const [worldRadius, setWorldRadius] = useState(2);
    const renderer = useMemo(() => L.svg({ padding: 1 }), []);
    const worlds = Array.from(
        { length: worldRadius * 2 + 1 },
        (_, index) => index - worldRadius
    );
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
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
        <div className="radio-map-container h-full w-full overflow-hidden [&_.leaflet-control-zoom_a]:h-11 [&_.leaflet-control-zoom_a]:w-11 [&_.leaflet-control-zoom_a]:leading-11">
            <MapContainer
                renderer={renderer}
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                maxZoom={6}
                zoomControl={false}
                attributionControl={false}
                dragging={true}
                worldCopyJump={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                className="h-full w-full"
            >
                <MapBounds
                    selectedCountry={selectedCountry}
                    countries={countries}
                    onWorldRadiusChange={setWorldRadius}
                />
                <ZoomControl position="topright" />
                {countries &&
                    worlds.map((world) => (
                        <GeoJSON
                            key={`${selectedCountry ?? "default"}:${world}`}
                            data={countries}
                            coordsToLatLng={(coordinates): L.LatLng =>
                                L.latLng(
                                    coordinates[1],
                                    coordinates[0] + world * 360,
                                    coordinates[2]
                                )
                            }
                            style={getCountryStyle(selectedCountry)}
                            onEachFeature={onEachCountryFeature(
                                onCountryClick,
                                selectedCountry
                            )}
                        />
                    ))}
                {worlds.flatMap((world) =>
                    savedStations
                        .filter(
                            (station) =>
                                station.geoLat !== null &&
                                station.geoLong !== null &&
                                Number.isFinite(station.geoLat) &&
                                Number.isFinite(station.geoLong)
                        )
                        .map((station) => (
                            <CircleMarker
                                key={`${station.publicId}:${world}`}
                                center={[
                                    station.geoLat!,
                                    station.geoLong! + world * 360,
                                ]}
                                radius={6}
                                pathOptions={{
                                    color: "#fff",
                                    weight: 1.5,
                                    fillColor: "#ee1086",
                                    fillOpacity: 1,
                                }}
                            >
                                <Tooltip>{station.name}</Tooltip>
                                <Popup>
                                    <p>{station.name}</p>
                                    <button
                                        className="min-h-11 cursor-pointer font-semibold"
                                        onClick={(): void => {
                                            void rockIt.stationManager.setAndPlayStation(
                                                station
                                            );
                                        }}
                                    >
                                        {vocabulary.PLAY}
                                    </button>
                                </Popup>
                            </CircleMarker>
                        ))
                )}
            </MapContainer>
        </div>
    );
}
