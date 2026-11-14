import {
    emblemEngravings,
    emblemMotifPlacement,
} from "@rockit/ui/headless/emblemArtwork";
import { medalDesign, medalGemVertices } from "@rockit/ui/headless/medalShapes";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

function contour(league: string) {
    const points = medalGemVertices(league).map(
        ([x, y]) => new THREE.Vector2((x - 40) / 36, (40 - y) / 36)
    );
    if (THREE.ShapeUtils.isClockWise(points)) points.reverse();
    return points;
}
/** Closed gemstone crown with a flat base; the medal reverse stays a metal plane. */
export function createMedalGem(league: string) {
    const design = medalDesign(league),
        points = contour(league).map((p) => p.multiplyScalar(0.91));
    const rings = design.scales.map((scale, index) =>
        points.map(
            (p) =>
                new THREE.Vector3(
                    p.x * scale,
                    p.y * scale,
                    design.depths[index]
                )
        )
    );
    const vertices: number[] = [];
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
        vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let ring = 1; ring < rings.length; ring++)
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length,
                low = rings[ring - 1],
                high = rings[ring];
            tri(high[i], low[i], low[j]);
            tri(high[i], low[j], high[j]);
        }
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(points, [])) {
        tri(rings.at(-1)![a], rings.at(-1)![b], rings.at(-1)![c]);
        tri(rings[0][c], rings[0][b], rings[0][a]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.computeVertexNormals();
    return geometry;
}
/** Low-cost reflective pavilion entirely inside the front crown. */
export function createMedalPavilion(league: string) {
    const points = contour(league).map(
        (p) => new THREE.Vector3(p.x * 0.9, p.y * 0.9, 0.19)
    );
    const center = new THREE.Vector3(0, 0, 0.135),
        vertices: number[] = [];
    for (let i = 0; i < points.length; i++)
        vertices.push(
            ...center.toArray(),
            ...points[i].toArray(),
            ...points[(i + 1) % points.length].toArray()
        );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.computeVertexNormals();
    return geometry;
}
export function createMedalHalos(league: string) {
    return medalDesign(league).halos.map((d) => {
        const source = new SVGLoader()
            .parse(
                `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`
            )
            .paths[0].toShapes()[0];
        const shape = new THREE.Shape(
            source
                .getPoints(12)
                .map((p) => new THREE.Vector2((p.x - 40) / 36, (40 - p.y) / 36))
        );
        return new THREE.ExtrudeGeometry(shape, {
            depth: 0.1,
            steps: 1,
            bevelEnabled: true,
            bevelSize: 0.012,
            bevelThickness: 0.012,
            bevelSegments: 2,
            curveSegments: 8,
        });
    });
}
/** Exact SVG strokes keep corners/straight edges intact on the two metal-first leagues. */
export function createMedalInlay(variant: string, league: string) {
    const safe = Object.hasOwn(emblemEngravings, variant)
        ? variant
        : "ignition";
    const paths = new SVGLoader().parse(
        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${emblemEngravings[safe]}</svg>`
    ).paths;
    const placement = emblemMotifPlacement(league),
        parts: THREE.BufferGeometry[] = [];
    for (const path of paths)
        for (const contour of path.subPaths) {
            const stroke = SVGLoader.pointsToStroke(
                contour.getPoints(12),
                path.userData!.style as ReturnType<
                    typeof SVGLoader.getStrokeStyle
                >,
                8
            );
            if (!stroke) continue;
            const p = stroke.getAttribute("position");
            for (let i = 0; i < p.count; i++)
                p.setXYZ(
                    i,
                    ((p.getX(i) - 40) * placement.scale) / 36,
                    ((35 - p.getY(i)) * placement.scale +
                        40 -
                        placement.centerY) /
                        36,
                    0.143
                );
            for (let i = 0; i < p.count; i += 3) {
                const b = new THREE.Vector3().fromBufferAttribute(p, i + 1),
                    c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
                p.setXYZ(i + 1, c.x, c.y, c.z);
                p.setXYZ(i + 2, b.x, b.y, b.z);
            }
            stroke.computeVertexNormals();
            parts.push(stroke);
        }
    return parts;
}
