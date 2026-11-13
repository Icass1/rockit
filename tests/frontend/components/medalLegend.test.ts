// @vitest-environment jsdom
import {
    createLegendCrystals,
    createLegendCup,
    LEGEND_MOTIF_HEIGHT,
    LEGEND_WELL_FLOOR,
} from "@rockit/ui/browser/medalLegend.web";
import { expect, it } from "vitest";

function inspectSolid(geometry: ReturnType<typeof createLegendCup>) {
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

it("closes the Legend cup and joined crystals without open, duplicated or reversed edges", () => {
    for (const geometry of [createLegendCup(), createLegendCrystals()]) {
        try {
            inspectSolid(geometry);
        } finally {
            geometry.dispose();
        }
    }
});

it("keeps the central face and the full motif below the lip, with no cap across the well", () => {
    const geometry = createLegendCup();
    try {
        const positions = geometry.getAttribute("position");
        const enamel = geometry.groups.find(
            (group) => group.materialIndex === 1
        )!;
        for (let i = enamel.start; i < enamel.start + enamel.count; i++)
            expect(positions.getZ(i)).toBeCloseTo(LEGEND_WELL_FLOOR);
        const facesAtCenter: number[] = [];
        for (let i = 0; i < positions.count; i += 3) {
            const [a, b, c] = [0, 1, 2].map((offset) => ({
                x: positions.getX(i + offset),
                y: positions.getY(i + offset),
                z: positions.getZ(i + offset),
            }));
            const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
            if (cross < 1e-8) continue;
            const side = (p: typeof a, q: typeof a) => p.x * q.y - p.y * q.x;
            if (
                [side(a, b), side(b, c), side(c, a)].every(
                    (value) => value >= -1e-8
                )
            )
                facesAtCenter.push((a.z + b.z + c.z) / 3);
        }
        expect(facesAtCenter.length).toBeGreaterThan(0);
        expect(Math.max(...facesAtCenter)).toBeCloseTo(LEGEND_WELL_FLOOR);
        geometry.computeBoundingBox();
        expect(LEGEND_MOTIF_HEIGHT - 0.018).toBeGreaterThan(LEGEND_WELL_FLOOR);
        expect(LEGEND_MOTIF_HEIGHT + 0.018).toBeLessThan(
            geometry.boundingBox!.max.z - 0.02
        );
    } finally {
        geometry.dispose();
    }
});
