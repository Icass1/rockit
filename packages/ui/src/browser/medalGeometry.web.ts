import {
    emblemFamilyMarks,
    emblemFamilyPlacement,
    emblemFamilyVariant,
} from "@rockit/ui/headless/emblemFamilies";
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

const cross2 = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** Clip a filled glyph triangle to one convex crown facet in the XY plane. */
function clipFacet(polygon: THREE.Vector2[], facet: THREE.Vector3[]) {
    let result = polygon;
    for (let i = 0; i < 3 && result.length; i++) {
        const a = new THREE.Vector2(facet[i].x, facet[i].y),
            b = new THREE.Vector2(facet[(i + 1) % 3].x, facet[(i + 1) % 3].y),
            input = result;
        result = [];
        for (let j = 0; j < input.length; j++) {
            const p = input[j],
                q = input[(j + 1) % input.length],
                dp = cross2(a, b, p),
                dq = cross2(a, b, q);
            if (dp >= -1e-10) result.push(p);
            if (dp < -1e-10 !== dq < -1e-10)
                result.push(p.clone().lerp(q, dp / (dp - dq)));
        }
    }
    return result;
}

/** Physical filled relief, fitted to the existing gem facets rather than buried in glass. */
export function createMedalInlay(variant: string, league: string) {
    const placement = emblemFamilyPlacement(league),
        toWorld = (p: THREE.Vector2) =>
            new THREE.Vector2(
                ((p.x - 16) * placement.scale + placement.centerX - 40) / 36,
                ((16 - p.y) * placement.scale + 40 - placement.centerY) / 36
            );
    const paths = new SVGLoader().parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><path fill="white" fill-rule="evenodd" d="${emblemFamilyMarks[emblemFamilyVariant(variant)]}"/></svg>`
    ).paths;
    const shapes = paths
        .flatMap((path) => path.toShapes())
        .map((source) => {
            const points = source.extractPoints(8),
                shape = new THREE.Shape(points.shape.map(toWorld));
            shape.holes = points.holes.map(
                (hole) => new THREE.Path(hole.map(toWorld))
            );
            return shape;
        });
    const facets: THREE.Vector3[][] = [];
    if (medalDesign(league).jewel) {
        const crown = createMedalGem(league),
            p = crown.getAttribute("position");
        for (let i = 0; i < p.count; i += 3) {
            const triangle = [0, 1, 2].map((j) =>
                new THREE.Vector3().fromBufferAttribute(p, i + j)
            );
            const [a, b, c] = triangle;
            if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 1e-10)
                facets.push(triangle);
        }
        crown.dispose();
    } else {
        facets.push(
            [
                new THREE.Vector3(-1, -1, 0.13),
                new THREE.Vector3(1, -1, 0.13),
                new THREE.Vector3(1, 1, 0.13),
            ],
            [
                new THREE.Vector3(-1, -1, 0.13),
                new THREE.Vector3(1, 1, 0.13),
                new THREE.Vector3(-1, 1, 0.13),
            ]
        );
    }
    const top: number[] = [],
        sides: number[] = [],
        bottomOffset = 0.002,
        topOffset = 0.016;
    const emit = (
        target: number[],
        a: THREE.Vector3,
        b: THREE.Vector3,
        c: THREE.Vector3
    ) => {
        if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() > 1e-18)
            target.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    };
    const surfacePoint = (
        p: THREE.Vector2,
        facet: THREE.Vector3[],
        offset: number
    ) => {
        const [a, b, c] = facet,
            normal = b.clone().sub(a).cross(c.clone().sub(a));
        return new THREE.Vector3(
            p.x,
            p.y,
            a.z -
                (normal.x * (p.x - a.x) + normal.y * (p.y - a.y)) / normal.z +
                offset
        );
    };
    for (const shape of shapes) {
        const flat = new THREE.ShapeGeometry(shape, 8),
            p = flat.getAttribute("position"),
            index = flat.getIndex()!;
        for (let i = 0; i < index.count; i += 3) {
            const triangle = [0, 1, 2].map(
                (j) =>
                    new THREE.Vector2(
                        p.getX(index.getX(i + j)),
                        p.getY(index.getX(i + j))
                    )
            );
            if (
                cross2(
                    ...(triangle as [
                        THREE.Vector2,
                        THREE.Vector2,
                        THREE.Vector2,
                    ])
                ) < 0
            )
                triangle.reverse();
            for (const facet of facets) {
                const clipped = clipFacet(triangle, facet);
                for (let j = 1; j + 1 < clipped.length; j++) {
                    const points = [clipped[0], clipped[j], clipped[j + 1]];
                    emit(
                        top,
                        ...(points.map((v) =>
                            surfacePoint(v, facet, topOffset)
                        ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3])
                    );
                    emit(
                        sides,
                        ...(points
                            .reverse()
                            .map((v) =>
                                surfacePoint(v, facet, bottomOffset)
                            ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3])
                    );
                }
            }
        }
        flat.dispose();
        // Walls only follow actual ink/counter boundaries, never triangulation seams.
        const loops = shape.extractPoints(8);
        for (const [loopIndex, loop] of [
            loops.shape,
            ...loops.holes,
        ].entries()) {
            if (THREE.ShapeUtils.isClockWise(loop) !== loopIndex > 0)
                loop.reverse();
            for (let i = 0; i < loop.length; i++) {
                const a = loop[i],
                    b = loop[(i + 1) % loop.length],
                    seen = new Set<string>();
                if (a.distanceToSquared(b) < 1e-16) continue;
                for (const facet of facets) {
                    let low = 0,
                        high = 1;
                    for (let edge = 0; edge < 3; edge++) {
                        const c = new THREE.Vector2(
                                facet[edge].x,
                                facet[edge].y
                            ),
                            d = new THREE.Vector2(
                                facet[(edge + 1) % 3].x,
                                facet[(edge + 1) % 3].y
                            ),
                            da = cross2(c, d, a),
                            db = cross2(c, d, b);
                        if (da < -1e-10 && db < -1e-10) {
                            high = -1;
                            break;
                        }
                        if (da < -1e-10) low = Math.max(low, da / (da - db));
                        else if (db < -1e-10)
                            high = Math.min(high, da / (da - db));
                    }
                    if (high - low < 1e-8) continue;
                    const key = `${low.toFixed(7)}:${high.toFixed(7)}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const p = a.clone().lerp(b, low),
                        q = a.clone().lerp(b, high),
                        lowerA = surfacePoint(p, facet, bottomOffset),
                        lowerB = surfacePoint(q, facet, bottomOffset),
                        upperA = surfacePoint(p, facet, topOffset),
                        upperB = surfacePoint(q, facet, topOffset);
                    emit(sides, lowerA, lowerB, upperB);
                    emit(sides, lowerA, upperB, upperA);
                }
            }
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([...top, ...sides], 3)
    );
    geometry.addGroup(0, top.length / 3, 0);
    geometry.addGroup(top.length / 3, sides.length / 3, 1);
    geometry.computeVertexNormals();
    return geometry;
}
