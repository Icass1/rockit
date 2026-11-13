import { createMedalOutline } from "@rockit/ui/browser/medalEngraving.web";
import {
    emblemEngravings,
    emblemMotifPlacement,
    legendFacets,
    legendWellPath,
} from "@rockit/ui/headless/emblemArtwork";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const FRAME_TOP = 0.12;
export const LEGEND_WELL_FLOOR = 0.108;
export const LEGEND_MOTIF_HEIGHT = 0.112;

type Batch = number[];
function triangle(
    batch: Batch,
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3
) {
    batch.push(...a.toArray(), ...b.toArray(), ...c.toArray());
}
function geometry(batches: Batch[]) {
    const result = new THREE.BufferGeometry();
    result.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(batches.flat(), 3)
    );
    let offset = 0;
    batches.forEach((batch, index) => {
        result.addGroup(offset, batch.length / 3, index);
        offset += batch.length / 3;
    });
    const position = result.getAttribute("position");
    const uv = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
        uv[i * 2] = position.getX(i) / 2 + 0.5;
        uv[i * 2 + 1] = position.getY(i) / 2 + 0.5;
    }
    result.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    result.computeVertexNormals();
    return result;
}
function loop(points: THREE.Vector2[]) {
    const clean = points.filter(
        (point, index) =>
            !index || point.distanceToSquared(points[index - 1]) > 1e-12
    );
    if (
        clean.length > 1 &&
        clean[0].distanceToSquared(clean[clean.length - 1]) < 1e-12
    )
        clean.pop();
    if (THREE.ShapeUtils.isClockWise(clean)) clean.reverse();
    return clean;
}
function scaled(points: THREE.Vector2[], scale: number) {
    return points.map((point) => point.clone().multiplyScalar(scale));
}
function cap(
    batch: Batch,
    contour: THREE.Vector2[],
    holes: THREE.Vector2[][],
    z: number,
    front: boolean
) {
    const outer = contour.map((point) => point.clone());
    const inner = holes.map((hole) =>
        hole.map((point) => point.clone()).reverse()
    );
    const points = [outer, ...inner].flat();
    for (const indices of THREE.ShapeUtils.triangulateShape(outer, inner)) {
        let [a, b, c] = indices.map(
            (index) => new THREE.Vector3(points[index].x, points[index].y, z)
        );
        const positive =
            (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
        if (positive !== front) [b, c] = [c, b];
        triangle(batch, a, b, c);
    }
}
function band(
    batch: Batch,
    lower: THREE.Vector2[],
    lowerZ: number,
    upper: THREE.Vector2[],
    upperZ: number,
    inward = false
) {
    for (let i = 0; i < lower.length; i++) {
        const j = (i + 1) % lower.length;
        const a = new THREE.Vector3(upper[i].x, upper[i].y, upperZ);
        const b = new THREE.Vector3(lower[i].x, lower[i].y, lowerZ);
        const c = new THREE.Vector3(lower[j].x, lower[j].y, lowerZ);
        const d = new THREE.Vector3(upper[j].x, upper[j].y, upperZ);
        if (inward) {
            triangle(batch, a, c, b);
            triangle(batch, a, d, c);
        } else {
            triangle(batch, a, b, c);
            triangle(batch, a, c, d);
        }
    }
}

/** One closed cup: outside wall, polished lip, inward walls and a recessed enamel floor. */
export function createLegendCup() {
    const outer = loop(createMedalOutline("legend", 1).getPoints());
    const path = new SVGLoader().parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><path d="${legendWellPath}"/></svg>`
    ).paths[0];
    const well = loop(
        path
            .toShapes()[0]
            .getPoints(8)
            .map(
                (point) =>
                    new THREE.Vector2((point.x - 40) / 36, (40 - point.y) / 36)
            )
    );
    const outerLip = scaled(outer, 0.99),
        back = scaled(outer, 0.99);
    const mouth = scaled(well, 1.01),
        floor = scaled(well, 0.995);
    const metal: Batch = [],
        enamel: Batch = [],
        polished: Batch = [];
    band(metal, outer, -0.09, outer, 0.09);
    band(polished, outer, 0.09, outerLip, FRAME_TOP);
    band(polished, back, -0.105, outer, -0.09);
    cap(metal, back, [], -0.105, false);
    cap(metal, outerLip, [mouth], FRAME_TOP, true);
    band(polished, well, 0.116, mouth, FRAME_TOP, true);
    band(polished, floor, LEGEND_WELL_FLOOR, well, 0.116, true);
    cap(enamel, floor, [], LEGEND_WELL_FLOOR, true);
    return geometry([metal, enamel, polished]);
}

/** Adjacent crystal roofs share exact edges; only exposed boundaries receive side walls. */
export function createLegendCrystals() {
    const front: Batch = [],
        shell: Batch = [];
    const edges = new Map<
        string,
        { a: THREE.Vector2; b: THREE.Vector2; count: number }
    >();
    const key = (point: THREE.Vector2) =>
        `${point.x.toFixed(8)},${point.y.toFixed(8)}`;
    for (const polygon of legendFacets) {
        const points = loop(
            polygon.map(
                ([x, y]) => new THREE.Vector2((x - 40) / 36, (40 - y) / 36)
            )
        );
        const center = points
            .reduce((sum, point) => sum.add(point), new THREE.Vector2())
            .divideScalar(points.length);
        // A small polished table and a crown of cut facets on both faces.
        const table = points.map((point) => point.clone().lerp(center, 0.58));
        for (let i = 0; i < points.length; i++) {
            const a = points[i],
                b = points[(i + 1) % points.length];
            const id = [key(a), key(b)].sort().join("|");
            const previous = edges.get(id);
            if (previous) previous.count++;
            else edges.set(id, { a, b, count: 1 });
        }
        band(front, points, 0.025, table, 0.2);
        cap(front, table, [], 0.2, true);
        band(front, table, -0.2, points, -0.025);
        cap(front, table, [], -0.2, false);
    }
    for (const { a, b, count } of edges.values()) {
        if (count !== 1) continue;
        const topA = new THREE.Vector3(a.x, a.y, 0.025),
            topB = new THREE.Vector3(b.x, b.y, 0.025);
        const bottomA = new THREE.Vector3(a.x, a.y, -0.025),
            bottomB = new THREE.Vector3(b.x, b.y, -0.025);
        triangle(shell, topA, bottomA, bottomB);
        triangle(shell, topA, bottomB, topB);
    }
    return geometry([front, shell]);
}

/** Flat, exact SVG strokes preserve straight sides and corners instead of smoothing them into wire. */
export function createLegendMotif(variant: string) {
    const paths = new SVGLoader().parse(
        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${emblemEngravings[variant]}</svg>`
    ).paths;
    const placement = emblemMotifPlacement("legend");
    const parts: THREE.BufferGeometry[] = [];
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
            const position = stroke.getAttribute("position");
            for (let i = 0; i < position.count; i++)
                position.setXYZ(
                    i,
                    ((position.getX(i) - 40) * placement.scale) / 36,
                    ((35 - position.getY(i)) * placement.scale +
                        40 -
                        placement.centerY) /
                        36,
                    LEGEND_MOTIF_HEIGHT
                );
            // SVG's downward Y axis reverses the face winding in world space.
            for (let i = 0; i < position.count; i += 3) {
                const b = new THREE.Vector3().fromBufferAttribute(
                    position,
                    i + 1
                );
                const c = new THREE.Vector3().fromBufferAttribute(
                    position,
                    i + 2
                );
                position.setXYZ(i + 1, c.x, c.y, c.z);
                position.setXYZ(i + 2, b.x, b.y, b.z);
            }
            stroke.computeVertexNormals();
            parts.push(stroke);
        }
    return parts;
}
