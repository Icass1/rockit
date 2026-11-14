// @vitest-environment jsdom
import { createMedalOutline } from "@rockit/ui/browser/medalEngraving.web";
import {
    createMedalGem,
    createMedalInlay,
} from "@rockit/ui/browser/medalGeometry.web";
import {
    emblemFamilyMarks,
    emblemFamilyPlacement,
} from "@rockit/ui/headless/emblemFamilies";
import {
    medalDesign,
    medalGemVertices,
    medalLeagues,
} from "@rockit/ui/headless/medalShapes";
import { expect, it } from "vitest";

function inspectSolid(geometry: ReturnType<typeof createMedalGem>) {
    const positions = geometry.getAttribute("position");
    const edges = new Map<string, { count: number; direction: number }>();
    let volume = 0;
    for (let i = 0; i < positions.count; i += 3) {
        const vertices = [0, 1, 2].map((offset) => [
            positions.getX(i + offset),
            positions.getY(i + offset),
            positions.getZ(i + offset),
        ]);
        const [a, b, c] = vertices;
        const ab = b.map((value, axis) => value - a[axis]);
        const ac = c.map((value, axis) => value - a[axis]);
        const cross = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
        ];
        expect(
            cross.reduce((sum, value) => sum + value * value, 0)
        ).toBeGreaterThan(1e-14);
        volume +=
            (a[0] * (b[1] * c[2] - b[2] * c[1]) +
                a[1] * (b[2] * c[0] - b[0] * c[2]) +
                a[2] * (b[0] * c[1] - b[1] * c[0])) /
            6;
        const keys = vertices.map((vertex) =>
            vertex.map((value) => value.toFixed(6)).join(",")
        );
        for (let j = 0; j < 3; j++) {
            const from = keys[j],
                to = keys[(j + 1) % 3];
            const key = [from, to].sort().join("|");
            const edge = edges.get(key) ?? { count: 0, direction: 0 };
            edge.count++;
            edge.direction += from < to ? 1 : -1;
            edges.set(key, edge);
        }
    }
    expect(
        Array.from(edges.values()).filter(
            (edge) => edge.count !== 2 || edge.direction !== 0
        )
    ).toEqual([]);
    expect(volume).toBeGreaterThan(0);
}

it.each(medalLeagues.filter((league) => medalDesign(league).jewel))(
    "builds a closed %s gemstone with a flat base entirely in front of the reverse",
    (league) => {
        const gem = createMedalGem(league);
        try {
            inspectSolid(gem);
            gem.computeBoundingBox();
            expect(gem.boundingBox!.min.z).toBeCloseTo(0.13);
            expect(gem.boundingBox!.max.z).toBeGreaterThan(0.25);
            expect(gem.getAttribute("position").count / 3).toBeLessThan(200);
        } finally {
            gem.dispose();
        }
    }
);
it("samples the bronze coin finely enough to remain round rather than visibly polygonal", () => {
    const points = createMedalOutline("bronze", 1).getPoints();
    expect(points.length).toBeGreaterThanOrEqual(96);
    for (const point of points) expect(point.length()).toBeCloseTo(34 / 36, 4);
});

const crossXY = (a: { x: number; y: number }, b: typeof a, c: typeof a) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function triangles(
    geometry: ReturnType<typeof createMedalGem>,
    count?: number
) {
    const p = geometry.getAttribute("position");
    return Array.from({ length: (count ?? p.count) / 3 }, (_, i) =>
        [0, 1, 2].map((j) => ({
            x: p.getX(i * 3 + j),
            y: p.getY(i * 3 + j),
            z: p.getZ(i * 3 + j),
        }))
    );
}
function projectedArea(geometry: ReturnType<typeof createMedalInlay>) {
    return triangles(geometry, geometry.groups[0].count).reduce(
        (sum, [a, b, c]) => sum + crossXY(a, b, c) / 2,
        0
    );
}
it.each(Object.keys(emblemFamilyMarks))(
    "keeps the complete %s silhouette above every crown with actual relief walls",
    (variant) => {
        const flat = createMedalInlay(variant, "bronze");
        const area = projectedArea(flat);
        flat.dispose();
        expect(area).toBeGreaterThan(0.02);
        for (const league of medalLeagues) {
            const relief = createMedalInlay(variant, league),
                crown = createMedalGem(league);
            try {
                const facets = triangles(crown).filter(
                    ([a, b, c]) => crossXY(a, b, c) > 1e-10
                );
                const scale =
                    emblemFamilyPlacement(league).scale /
                    emblemFamilyPlacement("bronze").scale;
                expect(projectedArea(relief)).toBeCloseTo(
                    area * scale * scale,
                    6
                );
                if (league === "diamond" || league === "legend") {
                    const design = medalDesign(league),
                        tableScale = 0.91 * design.scales.at(-1)!,
                        table = medalGemVertices(league).map(([x, y]) => ({
                            x: ((x - 40) * tableScale) / 36,
                            y: ((40 - y) * tableScale) / 36,
                        }));
                    relief.computeBoundingBox();
                    expect(relief.boundingBox!.min.z).toBeCloseTo(
                        design.depths.at(-1)! + 0.002,
                        6
                    );
                    expect(relief.boundingBox!.max.z).toBeCloseTo(
                        design.depths.at(-1)! + 0.016,
                        6
                    );
                    const p = relief.getAttribute("position");
                    for (let i = 0; i < p.count; i++) {
                        const point = { x: p.getX(i), y: p.getY(i) };
                        for (let j = 0; j < table.length; j++) {
                            const a = table[j],
                                b = table[(j + 1) % table.length];
                            const clearance =
                                -crossXY(a, b, point) /
                                Math.hypot(b.x - a.x, b.y - a.y);
                            expect(
                                clearance,
                                `${league}/${variant}`
                            ).toBeGreaterThan(0.75 / 36);
                        }
                    }
                }
                expect(relief.groups[1].count).toBeGreaterThan(0);
                expect(relief.getAttribute("position").count / 3).toBeLessThan(
                    2500
                );
                expect(
                    Array.from(relief.getAttribute("position").array).every(
                        Number.isFinite
                    )
                ).toBe(true);
                for (const points of triangles(
                    relief,
                    relief.groups[0].count
                )) {
                    const center = {
                        x: points.reduce((sum, p) => sum + p.x, 0) / 3,
                        y: points.reduce((sum, p) => sum + p.y, 0) / 3,
                        z: points.reduce((sum, p) => sum + p.z, 0) / 3,
                    };
                    expect(
                        crossXY(points[0], points[1], points[2])
                    ).toBeGreaterThan(0);
                    let height = 0.13;
                    if (medalDesign(league).jewel) {
                        const facet = facets.find(
                            ([a, b, c]) =>
                                crossXY(a, b, center) >= -1e-8 &&
                                crossXY(b, c, center) >= -1e-8 &&
                                crossXY(c, a, center) >= -1e-8
                        );
                        expect(facet).toBeDefined();
                        const [a, b, c] = facet!;
                        height =
                            (crossXY(b, c, center) * a.z +
                                crossXY(c, a, center) * b.z +
                                crossXY(a, b, center) * c.z) /
                            crossXY(a, b, c);
                    }
                    expect(center.z - height).toBeCloseTo(0.016, 6);
                }
                const topNormal = relief.getAttribute("normal");
                expect(
                    Array.from({ length: relief.groups[0].count }, (_, i) =>
                        topNormal.getZ(i)
                    ).every((z) => z > 0)
                ).toBe(true);
            } finally {
                relief.dispose();
                crown.dispose();
            }
        }
    }
);
it("preserves the open video counter in the filled relief", () => {
    const geometry = createMedalInlay("camera", "diamond");
    try {
        const counterCenter = { x: 0, y: 1 / 36 };
        const covering = triangles(geometry, geometry.groups[0].count).filter(
            ([a, b, c]) =>
                crossXY(a, b, counterCenter) >= -1e-9 &&
                crossXY(b, c, counterCenter) >= -1e-9 &&
                crossXY(c, a, counterCenter) >= -1e-9
        );
        expect(covering).toEqual([]);
    } finally {
        geometry.dispose();
    }
});
