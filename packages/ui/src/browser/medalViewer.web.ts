import type { ListeningBadgeResponse } from "@rockit/shared";
import type { getTheme } from "@rockit/theme";
import {
    createEngravedRear,
    createMedalOutline,
} from "@rockit/ui/browser/medalEngraving.web";
import {
    emblemEngravings,
    emblemInks,
    emblemPalette,
    emblemSilhouettes,
    legendFacets,
} from "@rockit/ui/headless/emblemArtwork";
import { medalAwardDate, romanTier } from "@rockit/ui/headless/medalDesign";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

/** Browser-only, loaded on inspection. No animation loop or remote textures. */
export function createMedalViewer(
    container: HTMLElement,
    badge: ListeningBadgeResponse,
    ownerName: string,
    colors: ReturnType<typeof getTheme>,
    onFailure: () => void
) {
    const releases: Array<() => void> = [];
    let disposed = false;
    const own = <T extends { dispose: () => void }>(resource: T): T => {
        releases.push(() => resource.dispose());
        return resource;
    };
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        for (const release of releases.reverse()) release();
    };
    try {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        releases.push(() => {
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
        camera.position.set(0, 0, 4.25);
        const controls = own(new OrbitControls(camera, renderer.domElement));
        controls.enablePan = false;
        controls.enableDamping = false;
        controls.minDistance = 3.1;
        controls.maxDistance = 7;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const environment = own(pmrem.fromScene(room, 0.04));
        scene.environment = environment.texture;
        room.dispose();
        pmrem.dispose();
        scene.add(
            new THREE.HemisphereLight(
                colors["medal-silver-highlight"],
                colors["medal-gold-shadow"],
                0.6
            )
        );
        const key = new THREE.DirectionalLight(
            colors["medal-gold-highlight"],
            4
        );
        key.position.set(-3, 4, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(
            colors["medal-diamond-highlight"],
            2.5
        );
        fill.position.set(4, 0, -3);
        scene.add(fill);
        const palette = emblemPalette(colors, badge.league, !!badge.earnedAt);
        const league = Object.hasOwn(emblemSilhouettes, badge.league)
            ? badge.league
            : "gold";
        const variant = Object.hasOwn(emblemInks, badge.visualVariant)
            ? (badge.visualVariant as keyof typeof emblemInks)
            : "ignition";
        const ink = badge.earnedAt
            ? colors[emblemInks[variant]]
            : colors["muted-foreground"];
        const metal = own(
            new THREE.MeshStandardMaterial({
                color: palette.metal,
                metalness: 0.94,
                roughness: 0.22,
            })
        );
        const edge = own(
            new THREE.MeshStandardMaterial({
                color: palette.highlight,
                metalness: 1,
                roughness: 0.14,
            })
        );
        const enamel = own(
            new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(palette.face).lerp(
                    new THREE.Color(ink),
                    0.22
                ),
                metalness: 0.35,
                roughness: 0.32,
                clearcoat: 0.9,
                clearcoatRoughness: 0.14,
            })
        );
        const relief = own(
            new THREE.MeshStandardMaterial({
                color: ink,
                metalness: 0.8,
                roughness: 0.24,
            })
        );
        const group = new THREE.Group();
        group.rotation.set(0.2, -0.52, 0);
        scene.add(group);
        const loader = new SVGLoader();
        const outline = (scale: number) => createMedalOutline(league, scale);
        const solid = (
            scale: number,
            depth: number,
            z: number,
            material: THREE.Material,
            bevel: number,
            hole = 0
        ) => {
            const shape = outline(scale);
            if (hole > 0)
                shape.holes.push(new THREE.Path(outline(hole).getPoints()));
            const geometry = own(
                new THREE.ExtrudeGeometry(shape, {
                    depth,
                    bevelEnabled: true,
                    bevelSegments: 2,
                    steps: 1,
                    bevelSize: bevel / 36,
                    bevelThickness: bevel / 36,
                    curveSegments: 4,
                })
            );
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = z;
            group.add(mesh);
            return mesh;
        };
        solid(1, 0.18, -0.09, metal, 0.8);
        solid(0.91, 0.025, 0.112, edge, 0.15, 0.83);
        solid(0.82, 0.012, 0.113, enamel, 0.16);
        const rearRim = solid(0.91, 0.025, -0.112, edge, 0.15, 0.83);
        rearRim.rotation.y = Math.PI;
        const motifs = loader.parse(
            `<svg xmlns="http://www.w3.org/2000/svg">${emblemEngravings[variant]}</svg>`
        ).paths;
        for (const path of motifs) {
            for (const contour of path.subPaths) {
                const points = contour
                    .getPoints(20)
                    .map(
                        (point) =>
                            new THREE.Vector3(
                                ((point.x - 40) * 0.66) / 36,
                                ((35 - point.y) * 0.66) / 36 + 0.11,
                                0.158
                            )
                    );
                if (points.length < 2) continue;
                const curve = new THREE.CatmullRomCurve3(
                    points,
                    false,
                    "centripetal"
                );
                group.add(
                    new THREE.Mesh(
                        own(
                            new THREE.TubeGeometry(
                                curve,
                                Math.min(96, points.length * 2),
                                0.018,
                                6,
                                false
                            )
                        ),
                        relief
                    )
                );
            }
        }
        if (league === "legend") {
            for (const points of legendFacets) {
                const mapped = points.map(
                    ([x, y]) =>
                        new THREE.Vector3(
                            ((x - 40) * 0.97) / 36,
                            ((40 - y) * 0.97) / 36,
                            0.145
                        )
                );
                const center = mapped
                    .reduce((sum, point) => sum.add(point), new THREE.Vector3())
                    .divideScalar(mapped.length);
                center.z = 0.23;
                const vertices: number[] = [];
                for (let i = 0; i < mapped.length; i++) {
                    let a = mapped[i],
                        b = mapped[(i + 1) % mapped.length];
                    if (
                        (a.x - center.x) * (b.y - center.y) -
                            (a.y - center.y) * (b.x - center.x) <
                        0
                    )
                        [a, b] = [b, a];
                    vertices.push(
                        ...center.toArray(),
                        ...a.toArray(),
                        ...b.toArray()
                    );
                }
                const geometry = own(new THREE.BufferGeometry());
                geometry.setAttribute(
                    "position",
                    new THREE.Float32BufferAttribute(vertices, 3)
                );
                geometry.computeVertexNormals();
                group.add(new THREE.Mesh(geometry, edge));
            }
        }
        const engraving = document.createElement("canvas");
        engraving.width = engraving.height = 1024;
        const context = engraving.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.fillStyle = colors["recap-foreground"];
        context.fillRect(0, 0, 1024, 1024);
        context.fillStyle = colors["explicit-foreground"];
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "600 44px sans-serif";
        // Canvas text never enters HTML/SVG markup, and is fitted rather than clipped.
        const name = ownerName.trim();
        const nameWidth = Math.max(1, context.measureText(name).width);
        context.save();
        context.translate(512, 625);
        context.scale(Math.min(1, 510 / nameWidth), 1);
        context.fillText(name, 0, 0);
        context.restore();
        context.font = "32px sans-serif";
        if (badge.earnedAt && Number.isFinite(Date.parse(badge.earnedAt)))
            context.fillText(medalAwardDate(badge.earnedAt), 512, 700);
        context.font = "36px serif";
        context.fillText(romanTier(badge.tier), 512, 775);
        const bump = own(new THREE.CanvasTexture(engraving));
        const reverseMaterial = own(metal.clone());
        const etching = document.createElement("canvas");
        etching.width = etching.height = 1024;
        const shade = etching.getContext("2d");
        if (!shade) throw new Error("Canvas unavailable");
        shade.fillStyle = colors["recap-foreground"];
        shade.fillRect(0, 0, 1024, 1024);
        shade.globalAlpha = 0.5;
        shade.drawImage(engraving, 0, 0);
        const etchTexture = own(new THREE.CanvasTexture(etching));
        etchTexture.colorSpace = THREE.SRGBColorSpace;
        reverseMaterial.map = etchTexture;
        reverseMaterial.bumpMap = bump;
        reverseMaterial.bumpScale = 0.04;
        reverseMaterial.roughness = 0.4;
        const engraved = createEngravedRear(outline(0.82));
        const reverse = new THREE.Mesh(own(engraved.surface), [
            reverseMaterial,
            metal,
        ]);
        reverse.position.z = -0.109;
        reverse.rotation.y = Math.PI;
        group.add(reverse);
        for (const geometry of engraved.islands) {
            const island = new THREE.Mesh(own(geometry), metal);
            island.position.copy(reverse.position);
            island.rotation.copy(reverse.rotation);
            group.add(island);
        }
        const recess = own(
            new THREE.MeshStandardMaterial({
                color: new THREE.Color(palette.metal).lerp(
                    new THREE.Color(palette.shadow),
                    0.32
                ),
                metalness: 0.94,
                roughness: 0.32,
            })
        );
        const floor = new THREE.Mesh(own(engraved.floor), recess);
        floor.rotation.y = Math.PI;
        floor.position.z = -0.1137;
        group.add(floor);
        // The text is a relief texture; the brand itself has cut walls and a recessed floor.
        const position = reverse.geometry.getAttribute("position");
        const uv = reverse.geometry.getAttribute("uv");
        for (let i = 0; i < position.count; i++)
            uv.setXY(i, position.getX(i) / 2 + 0.5, position.getY(i) / 2 + 0.5);
        uv.needsUpdate = true;
        const draw = () => {
            if (!disposed && !document.hidden) renderer.render(scene, camera);
        };
        const resize = () => {
            const { width, height } = container.getBoundingClientRect();
            if (!width || !height) return;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            draw();
        };
        const observer = new ResizeObserver(resize);
        const visible = () => draw();
        const lost = (event: Event) => {
            event.preventDefault();
            onFailure();
        };
        renderer.domElement.addEventListener("webglcontextlost", lost);
        controls.addEventListener("change", draw);
        document.addEventListener("visibilitychange", visible);
        releases.push(() => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", visible);
            renderer.domElement.removeEventListener("webglcontextlost", lost);
        });
        container.appendChild(renderer.domElement);
        observer.observe(container);
        resize();
        const turn = (back = false) => {
            controls.reset();
            group.rotation.set(0.2, back ? Math.PI - 0.52 : -0.52, 0);
            draw();
        };
        return {
            front: () => turn(false),
            back: () => turn(true),
            rotate: (x: number, y: number) => {
                group.rotation.y += x;
                group.rotation.x += y;
                draw();
            },
            dispose,
        };
    } catch (error) {
        dispose();
        throw error;
    }
}
