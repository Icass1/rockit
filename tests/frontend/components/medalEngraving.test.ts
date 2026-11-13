// @vitest-environment jsdom
import {
    createEngravedRear,
    createMedalOutline,
} from "@rockit/ui/browser/medalEngraving.web";
import { expect, it } from "vitest";

function capArea(
    geometry: Pick<
        ReturnType<typeof createEngravedRear>["surface"],
        "computeBoundingBox" | "boundingBox" | "getAttribute" | "getIndex"
    >
) {
    geometry.computeBoundingBox();
    const z = geometry.boundingBox!.max.z;
    const points = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const count = index?.count ?? points.count;
    let area = 0;
    for (let i = 0; i < count; i += 3) {
        const ids = [0, 1, 2].map((offset) =>
            index ? index.getX(i + offset) : i + offset
        );
        if (!ids.every((id) => Math.abs(points.getZ(id) - z) < 1e-6)) continue;
        const [a, b, c] = ids.map((id) => ({
            x: points.getX(id),
            y: points.getY(id),
        }));
        area +=
            Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
    }
    return area;
}

it("cuts the brand into the plate while retaining its enclosed metal islands", () => {
    const outline = createMedalOutline("gold", 0.82);
    const points = outline.getPoints();
    const plainArea =
        Math.abs(
            points.reduce((sum, point, index) => {
                const next = points[(index + 1) % points.length];
                return sum + point.x * next.y - next.x * point.y;
            }, 0)
        ) / 2;
    const cut = createEngravedRear(outline);
    try {
        expect(outline.holes).toHaveLength(0);
        expect(cut.islands.length).toBeGreaterThan(0);
        const plateArea =
            capArea(cut.surface) +
            cut.islands.reduce((sum, geometry) => sum + capArea(geometry), 0);
        expect(plainArea - plateArea).toBeGreaterThan(capArea(cut.floor) * 0.5);
        expect(plateArea).toBeGreaterThan(plainArea * 0.5);
        expect(cut.floor.getAttribute("position").count).toBeGreaterThan(0);
        expect(
            Array.from(cut.surface.getAttribute("position").array).every(
                Number.isFinite
            )
        ).toBe(true);
    } finally {
        cut.surface.dispose();
        cut.floor.dispose();
        cut.islands.forEach((geometry) => geometry.dispose());
    }
});
