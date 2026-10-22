"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { Feature, FeatureCollection, Position } from "geojson";
import L from "leaflet";
import {
    GeoJSON,
    MapContainer,
    Marker,
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
import { Play } from "lucide-react";
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
            className: "radio-country",
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

function MapHoverReset({
    selectedCountry,
}: {
    selectedCountry: string | null;
}): null {
    const map = useMap();

    useEffect(() => {
        const reset = (): void => {
            map.eachLayer((layer) => {
                if (!(layer instanceof L.GeoJSON)) return;
                layer.eachLayer((child) => {
                    const path = child as L.Path & {
                        feature?: GeoJSON.Feature;
                    };
                    if (typeof path.setStyle !== "function") return;
                    path.closeTooltip();
                    path.setStyle(getCountryStyle(selectedCountry)(path.feature));
                });
            });
        };
        map.on("dragstart", reset);
        return (): void => {
            map.off("dragstart", reset);
        };
    }, [map, selectedCountry]);

    return null;
}

/* ── Component ─────────────────────────────────────────── */

export default function RadioMap({
    onCountryClick,
    selectedCountry,
    savedStations = [],
}: RadioMapProps): JSX.Element {
    const [worldRadius, setWorldRadius] = useState(2);
    const worlds = Array.from(
        { length: worldRadius * 2 + 1 },
        (_, index) => index - worldRadius
    );
    const renderer = useMemo(() => L.svg({ padding: 1 }), []);
    const stationIcons = useMemo(() => {
        const icons = new Map<string, L.DivIcon>();
        if (typeof document === "undefined") return icons;
        for (let world = -worldRadius; world <= worldRadius; world++) {
            for (const station of savedStations) {
                const image = document.createElement("img");
                image.src =
                    station.imageUrl?.trim() || "/radio-placeholder.png";
                image.alt = "";
                image.width = 44;
                image.height = 44;
                image.style.cssText =
                    "width:44px;height:44px;object-fit:cover;border:2px solid #ee1086;border-radius:8px;background:#171717;box-shadow:0 2px 8px #0008";
                image.onerror = (): void => {
                    image.onerror = null;
                    image.src = "/radio-placeholder.png";
                };
                icons.set(
                    `${station.publicId}:${world}`,
                    L.divIcon({
                        html: image,
                        className: "radio-station-marker",
                        iconSize: [44, 44],
                        iconAnchor: [22, 22],
                        popupAnchor: [0, -22],
                    })
                );
            }
        }
        return icons;
    }, [savedStations, worldRadius]);
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

    const locatedStations = useMemo(() => {
        const countryCenters = new Map<
            string,
            { center: L.LatLng; area: number }
        >();
        for (const country of countries?.features ?? []) {
            const bounds = L.geoJSON(country).getBounds();
            if (!bounds.isValid()) continue;
            const area =
                (bounds.getEast() - bounds.getWest()) *
                (bounds.getNorth() - bounds.getSouth());
            const name = String(country.properties?.name).toLowerCase();
            if (area > (countryCenters.get(name)?.area ?? -1)) {
                countryCenters.set(name, { center: bounds.getCenter(), area });
            }
        }
        return savedStations.flatMap((station) => {
            if (
                station.geoLat !== null &&
                station.geoLong !== null &&
                Number.isFinite(station.geoLat) &&
                Number.isFinite(station.geoLong)
            )
                return [station];
            const name =
                station.country === "United States"
                    ? "United States of America"
                    : station.country;
            const location = countryCenters.get(
                name?.toLowerCase() ?? ""
            )?.center;
            return location
                ? [{ ...station, geoLat: location.lat, geoLong: location.lng }]
                : [];
        });
    }, [countries, savedStations]);

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
                <MapHoverReset selectedCountry={selectedCountry} />
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
                    locatedStations
                        .filter(
                            (station) =>
                                station.geoLat !== null &&
                                station.geoLong !== null &&
                                Number.isFinite(station.geoLat) &&
                                Number.isFinite(station.geoLong)
                        )
                        .map((station) => (
                            <Marker
                                key={`${station.publicId}:${world}`}
                                position={[
                                    station.geoLat!,
                                    station.geoLong! + world * 360,
                                ]}
                                icon={stationIcons.get(
                                    `${station.publicId}:${world}`
                                )}
                                title={station.name}
                                alt={station.name}
                            >
                                <Tooltip>{station.name}</Tooltip>
                                <Popup>
                                    <div className="flex items-center gap-2">
                                        <p className="m-0 font-semibold">
                                            {station.name}
                                        </p>
                                        <button
                                            type="button"
                                            aria-label={`${vocabulary.PLAY}: ${station.name}`}
                                            title={vocabulary.PLAY}
                                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-pink-500 text-white transition-colors hover:bg-pink-600"
                                            onClick={(): void => {
                                                void rockIt.stationManager.setAndPlayStation(
                                                    station
                                                );
                                            }}
                                        >
                                            <Play className="h-4 w-4 fill-current" />
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))
                )}
            </MapContainer>
        </div>
    );
}
