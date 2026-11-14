import { emblemBrandPaths } from "@rockit/ui/headless/medalDesign";
import { emblemSilhouettes } from "@rockit/ui/headless/medalShapes";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const contours = new Map<string, THREE.Vector2[]>();

/** Cache only the six public die contours; every caller gets its own mutable shape. */
export function createMedalOutline(league: string, scale: number) {
    const safeLeague = Object.hasOwn(emblemSilhouettes, league)
        ? league
        : "gold";
    let points = contours.get(safeLeague);
    if (!points) {
        const path = new SVGLoader().parse(
            `<svg xmlns="http://www.w3.org/2000/svg"><path d="${emblemSilhouettes[safeLeague]}"/></svg>`
        ).paths[0];
        points = path.toShapes()[0].getPoints(safeLeague === "bronze" ? 24 : 4);
        contours.set(safeLeague, points);
    }
    return new THREE.Shape(
        points.map(
            (point) =>
                new THREE.Vector2(
                    ((point.x - 40) * scale) / 36,
                    ((40 - point.y) * scale) / 36
                )
        )
    );
}

/** Cut the original brand out of the rear plate, preserving the metal islands. */
export function createEngravedRear(outer: THREE.Shape) {
    const paths = new SVGLoader().parse(
        `<svg xmlns="http://www.w3.org/2000/svg">${emblemBrandPaths.map((d) => `<path d="${d}"/>`).join("")}</svg>`
    ).paths;
    const sources = paths.flatMap((path) => path.toShapes());
    const base = (path: THREE.Path) =>
        path
            .getPoints(5)
            .map(
                (point) =>
                    new THREE.Vector2(
                        (345 + point.x * 0.65) / 512 - 1,
                        1 - (200 + point.y * 0.65) / 512
                    )
            );
    const samples = sources.flatMap((source) => base(source));
    const center = new THREE.Box2()
        .setFromPoints(samples)
        .getCenter(new THREE.Vector2());
    const boundary = outer
        .getPoints()
        .map((point) => point.clone().multiplyScalar(0.98));
    const contains = (point: THREE.Vector2) => {
        let inside = false;
        for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
            const a = boundary[i],
                b = boundary[j];
            if (
                a.y > point.y !== b.y > point.y &&
                point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
            )
                inside = !inside;
        }
        return inside;
    };
    let scale = 1;
    const fitted = (point: THREE.Vector2) =>
        point.clone().sub(center).multiplyScalar(scale).add(center);
    for (
        let attempt = 0;
        attempt < 32 && !samples.every((point) => contains(fitted(point)));
        attempt++
    )
        scale *= 0.96;
    if (!samples.every((point) => contains(fitted(point))))
        throw new Error("Brand does not fit medal plate");
    const transform = (path: THREE.Path) => base(path).map(fitted);
    const marks = sources.map((source) => {
        const shape = new THREE.Shape(transform(source));
        shape.holes = source.holes.map(
            (hole) => new THREE.Path(transform(hole))
        );
        return shape;
    });
    const plate = outer.clone();
    plate.holes.push(
        ...marks.map((shape) => new THREE.Path(shape.getPoints()))
    );
    const settings = {
        depth: 0.024,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.0012,
        bevelThickness: 0.0012,
        curveSegments: 5,
        steps: 1,
    };
    const geometries: THREE.BufferGeometry[] = [];
    try {
        const surface = new THREE.ExtrudeGeometry(plate, settings);
        geometries.push(surface);
        const islands = marks
            .flatMap((shape) => shape.holes)
            .map((hole) => {
                const geometry = new THREE.ExtrudeGeometry(
                    new THREE.Shape(hole.getPoints()),
                    settings
                );
                geometries.push(geometry);
                return geometry;
            });
        const floor = new THREE.ShapeGeometry(marks, 5);
        geometries.push(floor);
        return { surface, islands, floor };
    } catch (error) {
        geometries.forEach((geometry) => geometry.dispose());
        throw error;
    }
}
