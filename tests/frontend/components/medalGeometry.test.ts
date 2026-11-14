// @vitest-environment jsdom
import { createMedalOutline } from "@rockit/ui/browser/medalEngraving.web";
import {
    createMedalGem,
    createMedalInlay,
} from "@rockit/ui/browser/medalGeometry.web";
import { medalDesign, medalLeagues } from "@rockit/ui/headless/medalShapes";
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
it.each(["bronze", "silver"])(
    "keeps the %s video inlay planar with finite exact stroke geometry",
    (league) => {
        const parts = createMedalInlay("camera", league);
        try {
            expect(parts.length).toBeGreaterThan(0);
            for (const geometry of parts) {
                geometry.computeBoundingBox();
                expect(geometry.boundingBox!.min.z).toBeCloseTo(0.143);
                expect(geometry.boundingBox!.max.z).toBeCloseTo(0.143);
                expect(
                    Array.from(geometry.getAttribute("position").array).every(
                        Number.isFinite
                    )
                ).toBe(true);
            }
        } finally {
            parts.forEach((geometry) => geometry.dispose());
        }
    }
);
