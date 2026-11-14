import type { ListeningBadgeResponse } from "@rockit/shared";
import type { getTheme } from "@rockit/theme";
import {
    createEngravedRear,
    createMedalOutline,
} from "@rockit/ui/browser/medalEngraving.web";
import {
    createMedalGem,
    createMedalHalos,
    createMedalInlay,
    createMedalPavilion,
} from "@rockit/ui/browser/medalGeometry.web";
import {
    emblemInks,
    emblemPalette,
    emblemSilhouettes,
} from "@rockit/ui/headless/emblemArtwork";
import { emblemFamilyVariant } from "@rockit/ui/headless/emblemFamilies";
import { medalAwardDate, romanTier } from "@rockit/ui/headless/medalDesign";
import { medalDesign } from "@rockit/ui/headless/medalShapes";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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
        const maxDpr = window.matchMedia?.("(pointer: coarse)").matches
            ? 1.5
            : 2;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
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
        const room = new THREE.Scene();
        room.background = new THREE.Color(
            colors["medal-silver-metal"]
        ).multiplyScalar(0.35);
        const cards: THREE.Mesh[] = [];
        const card = (
            x: number,
            y: number,
            z: number,
            w: number,
            h: number,
            color: string,
            power: number
        ) => {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(color).multiplyScalar(power),
                    side: THREE.DoubleSide,
                    toneMapped: false,
                })
            );
            mesh.position.set(x, y, z);
            mesh.lookAt(0, 0, 0);
            room.add(mesh);
            cards.push(mesh);
        };
        card(-4, 1, 2, 1.2, 5, colors["medal-silver-highlight"], 2);
        card(-3.5, 1, 4, 0.3, 7, colors["medal-silver-highlight"], 4);
        card(4, 1, 2, 0.8, 5, colors["medal-silver-highlight"], 1.5);
        card(0, 5, 1, 5, 1.5, colors["medal-silver-highlight"], 1.7);
        card(-3, -1, -4, 2, 5, colors["medal-diamond-highlight"], 1.3);
        card(3, 0, -4, 1, 4, colors.primary, 0.5);
        try {
            const environment = own(pmrem.fromScene(room, 0.015));
            scene.environment = environment.texture;
        } finally {
            for (const mesh of cards) {
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            }
            pmrem.dispose();
        }
        scene.add(
            new THREE.HemisphereLight(
                colors["medal-silver-highlight"],
                colors["medal-gold-shadow"],
                0.6
            )
        );
        const key = new THREE.DirectionalLight(
            colors["medal-silver-highlight"],
            3
        );
        key.position.set(-3, 4, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(
            colors["medal-diamond-highlight"],
            1
        );
        fill.position.set(4, 0, -3);
        scene.add(fill);
        const palette = emblemPalette(colors, badge.league, !!badge.earnedAt);
        const league = Object.hasOwn(emblemSilhouettes, badge.league)
            ? badge.league
            : "gold";
        const variant = emblemFamilyVariant(badge.visualVariant, badge.scope);
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
        if (league === "legend")
            metal.color.lerp(
                new THREE.Color(colors["medal-silver-metal"]),
                0.45
            );
        const design = medalDesign(league);
        const gemColor = new THREE.Color(
            badge.earnedAt
                ? colors[`medal-${league}-gem`]
                : colors["medal-muted-metal"]
        );
        const group = new THREE.Group();
        group.rotation.set(0.1, -0.35, 0);
        scene.add(group);
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
        const matte = own(
            new THREE.MeshStandardMaterial({
                color: colors["recap-ink"],
                metalness: 0.85,
                roughness: 0.5,
            })
        );
        solid(1, 0.18, -0.09, metal, 0.35);
        solid(0.98, 0.018, 0.112, edge, 0.1, 0.91);
        if (design.jewel) {
            const jewel = own(
                new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color(palette.highlight).lerp(
                        gemColor,
                        0.16
                    ),
                    metalness: 0,
                    roughness: 0.035,
                    transmission: 0.92,
                    thickness: 0.45,
                    ior: 2.1,
                    attenuationColor: gemColor,
                    attenuationDistance: 0.6,
                    clearcoat: 0.7,
                    clearcoatRoughness: 0.03,
                    envMapIntensity: 1,
                    specularIntensity: 1,
                })
            );
            const pavilionColor = gemColor
                .clone()
                .lerp(
                    new THREE.Color(
                        league === "legend" && badge.earnedAt
                            ? colors.primary
                            : ink
                    ),
                    league === "legend" ? 0.1 : 0.08
                );
            const pavilion = own(
                new THREE.MeshPhysicalMaterial({
                    color: pavilionColor,
                    metalness: 0.9,
                    roughness: 0.075,
                    clearcoat: 1,
                    envMapIntensity: 1.5,
                })
            );
            // Satin fields retain their league hue between the stone and the polished frame.
            const inset =
                league === "gold" || league === "platinum"
                    ? own(
                          new THREE.MeshStandardMaterial({
                              color:
                                  league === "gold"
                                      ? new THREE.Color(palette.face).lerp(
                                            new THREE.Color(palette.shadow),
                                            0.3
                                        )
                                      : palette.face,
                              metalness: 0.12,
                              roughness: 0.65,
                          })
                      )
                    : matte;
            solid(0.9, 0.008, 0.104, inset, 0.02);
            group.add(
                new THREE.Mesh(own(createMedalPavilion(league)), pavilion)
            );
            group.add(new THREE.Mesh(own(createMedalGem(league)), jewel));
        } else {
            const face = own(
                new THREE.MeshStandardMaterial({
                    color: new THREE.Color(palette.metal).lerp(
                        new THREE.Color(palette.face),
                        0.25
                    ),
                    metalness: 0.9,
                    roughness: 0.45,
                })
            );
            solid(0.85, 0.012, 0.115, face, 0.1);
            if (league === "silver") solid(0.79, 0.008, 0.132, edge, 0.1, 0.76);
            if (league === "bronze") {
                const rim = new THREE.Mesh(
                    own(new THREE.TorusGeometry(0.86, 0.007, 6, 96)),
                    edge
                );
                rim.position.z = 0.134;
                group.add(rim);
            }
        }
        // Surface metal is drawn after glass, outside its refraction capture.
        const stamp = own(
            new THREE.MeshStandardMaterial({
                color: palette.highlight,
                metalness: 0.94,
                roughness: 0.25,
                transparent: true,
            })
        );
        const stampWalls = own(
            new THREE.MeshStandardMaterial({
                color: palette.shadow,
                metalness: 0.86,
                roughness: 0.32,
                transparent: true,
            })
        );
        group.add(
            new THREE.Mesh(own(createMedalInlay(variant, league)), [
                stamp,
                stampWalls,
            ])
        );
        for (const geometry of createMedalHalos(league)) {
            const arc = new THREE.Mesh(own(geometry), [metal, matte]);
            arc.position.z = -0.06;
            group.add(arc);
        }
        const rearRim = solid(0.91, 0.025, -0.112, edge, 0.15, 0.83);
        rearRim.rotation.y = Math.PI;
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
        context.translate(512, league === "platinum" ? 610 : 625);
        context.scale(
            Math.min(
                1,
                (["silver", "platinum", "legend"].includes(league)
                    ? 330
                    : 510) / nameWidth
            ),
            1
        );
        context.fillText(name, 0, 0);
        context.restore();
        context.font = "32px sans-serif";
        if (badge.earnedAt && Number.isFinite(Date.parse(badge.earnedAt)))
            context.fillText(
                medalAwardDate(badge.earnedAt),
                512,
                league === "platinum" ? 660 : 700,
                league === "platinum" ? 220 : 350
            );
        context.font = "36px serif";
        context.fillText(
            romanTier(badge.tier),
            512,
            league === "platinum" ? 710 : 775,
            league === "platinum" ? 150 : 210
        );
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
            if (!disposed && !document.hidden) {
                renderer.render(scene, camera);
            }
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
            group.rotation.set(0.1, back ? Math.PI - 0.35 : -0.35, 0);
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
            getDiagnostics: () => ({
                calls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
                geometries: renderer.info.memory.geometries,
                textures: renderer.info.memory.textures,
                pixelRatio: renderer.getPixelRatio(),
            }),
            dispose,
        };
    } catch (error) {
        dispose();
        throw error;
    }
}
