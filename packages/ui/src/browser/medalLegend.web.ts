import { createMedalOutline } from "@rockit/ui/browser/medalEngraving.web";
import {
    legendFacets,
    legendWellPath,
} from "@rockit/ui/headless/emblemArtwork";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const FRAME_TOP = 0.12;
export const LEGEND_WELL_FLOOR = 0.045;
export const LEGEND_MOTIF_HEIGHT = 0.072;

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
            .getPoints(1)
            .map(
                (point) =>
                    new THREE.Vector2((point.x - 40) / 36, (40 - point.y) / 36)
            )
    );
    const outerLip = scaled(outer, 0.97),
        back = scaled(outer, 0.97);
    const mouth = scaled(well, 1.04),
        floor = scaled(well, 0.97);
    const metal: Batch = [],
        enamel: Batch = [],
        polished: Batch = [];
    band(metal, outer, -0.09, outer, 0.09);
    band(polished, outer, 0.09, outerLip, FRAME_TOP);
    band(polished, back, -0.105, outer, -0.09);
    cap(metal, back, [], -0.105, false);
    cap(metal, outerLip, [mouth], FRAME_TOP, true);
    band(polished, well, 0.09, mouth, FRAME_TOP, true);
    band(polished, well, 0.055, well, 0.09, true);
    band(polished, floor, LEGEND_WELL_FLOOR, well, 0.055, true);
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
        const peak = new THREE.Vector3(center.x, center.y, 0.22);
        for (let i = 0; i < points.length; i++) {
            const a = points[i],
                b = points[(i + 1) % points.length];
            triangle(
                front,
                peak,
                new THREE.Vector3(a.x, a.y, 0.055),
                new THREE.Vector3(b.x, b.y, 0.055)
            );
            const id = [key(a), key(b)].sort().join("|");
            const previous = edges.get(id);
            if (previous) previous.count++;
            else edges.set(id, { a, b, count: 1 });
        }
        cap(shell, points, [], -0.065, false);
    }
    for (const { a, b, count } of edges.values()) {
        if (count !== 1) continue;
        const topA = new THREE.Vector3(a.x, a.y, 0.055),
            topB = new THREE.Vector3(b.x, b.y, 0.055);
        const bottomA = new THREE.Vector3(a.x, a.y, -0.065),
            bottomB = new THREE.Vector3(b.x, b.y, -0.065);
        triangle(shell, topA, bottomA, bottomB);
        triangle(shell, topA, bottomB, topB);
    }
    return geometry([front, shell]);
}
