const center = 50;
const base = 85;

type FlareProfile = {
    side: number;
    period: number;
    phase: number;
    reach: number;
    size: number;
};

const tiers = [
    {
        width: 10,
        height: 34,
        pulse: 0.29,
        rolls: 1,
        sparks: 0,
        phase: 110,
        flares: [],
    },
    {
        width: 15,
        height: 47,
        pulse: 0.49,
        rolls: 2,
        sparks: 1,
        phase: 318,
        flares: [
            { side: 0, period: 1290, phase: 0.1, reach: 0.56, size: 0.31 },
        ],
    },
    {
        width: 18.5,
        height: 58,
        pulse: 0.73,
        rolls: 3,
        sparks: 3,
        phase: 455,
        flares: [
            { side: -1, period: 1010, phase: 0.14, reach: 0.84, size: 0.4 },
            { side: 1, period: 1270, phase: 0.63, reach: 0.73, size: 0.32 },
        ],
    },
    {
        width: 20.5,
        height: 65,
        pulse: 1,
        rolls: 4,
        sparks: 6,
        phase: 202,
        flares: [
            { side: -1, period: 890, phase: 0.13, reach: 1.04, size: 0.44 },
            { side: 1, period: 1170, phase: 0.5, reach: 0.94, size: 0.46 },
            { side: 0, period: 630, phase: 0.77, reach: 0.59, size: 0.3 },
        ],
    },
] satisfies Array<{
    width: number;
    height: number;
    pulse: number;
    rolls: number;
    sparks: number;
    phase: number;
    flares: FlareProfile[];
}>;

function levelFor(days: number): number {
    return days >= 14 ? 3 : days >= 7 ? 2 : days >= 3 ? 1 : 0;
}

const mix = (a: number, b: number, fraction: number): number =>
    a + (b - a) * fraction;
const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const point = (x: number, y: number): string =>
    `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;

function smooth(start: number, end: number, value: number): number {
    const fraction = clamp((value - start) / (end - start));
    return fraction * fraction * (3 - 2 * fraction);
}

function bell(position: number, at: number, spread: number): number {
    return Math.exp(-Math.pow((position - at) / spread, 2));
}

function crossSection(u: number): number {
    const foot = Math.min(1, u / 0.18);
    const shoulder = 1 + 0.21 * bell(u, 0.36, 0.22);
    return Math.sqrt(foot * (2 - foot)) * Math.pow(1 - u, 0.83) * shoulder;
}

/** Smooth closed contour, sampled bottom to tip and back to the same foot. */
function contour(
    bottom: number,
    height: number,
    sample: (u: number) => { x: number; left: number; right: number },
    steps: number
): string {
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let step = 0; step <= steps; step++) {
        const u = step / steps;
        const { x, left: l, right: r } = sample(u);
        const y = bottom - height * u;
        left.push([x - l, y]);
        right.push([x + r, y]);
    }
    let d = `M${point(...left[0])}`;
    for (const edge of [left, right.reverse()]) {
        for (let i = 1; i < steps; i++) {
            const [x, y] = edge[i];
            const [nextX, nextY] = edge[i + 1];
            d += `Q${point(x, y)} ${point((x + nextX) / 2, (y + nextY) / 2)}`;
        }
        d += `L${point(...edge[steps])}`;
    }
    return d + "Z";
}

function liveFlare(
    { side, period, phase, reach, size }: FlareProfile,
    t: number
) {
    const cycle = t / period + phase;
    const age = cycle % 1;
    return {
        side: side || (Math.floor(cycle) % 2 === 0 ? 1 : -1),
        strength: smooth(0.04, 0.31, age) * (1 - smooth(0.46, 0.96, age)),
        height: reach * (0.39 + 0.61 * smooth(0.045, 0.58, age)),
        size,
    };
}

function flareContour(
    { side, strength, height, size }: ReturnType<typeof liveFlare>,
    peak: number,
    width: number,
    axis: (u: number) => number,
    edge: (u: number, side: number) => number,
    inner = false
): string {
    const start = inner ? 0.12 : 0.072;
    const end = Math.max(
        start + 0.01,
        Math.min(0.985, height * (inner ? 0.91 : 1))
    );
    const rootOffset = edge(start, side) * (inner ? 0.61 : 0.67);
    const hotLift = smooth(0.56, 0.92, end);
    const tipOffset = Math.min(
        width * 0.62,
        edge(end, side) + width * strength * (0.13 + hotLift * 0.36)
    );

    return contour(
        base - start * peak,
        (end - start) * peak,
        (q) => {
            const u = mix(start, end, q);
            const billow =
                Math.sin(Math.PI * Math.pow(q, 0.76)) * 0.33 * width * strength;
            const bend =
                mix(rootOffset, tipOffset, smooth(0.18, 1, q)) + billow;
            const half =
                width * size * strength * crossSection(q) * (inner ? 0.72 : 1);
            const clearance =
                width * strength * (0.23 + hotLift * 0.2) * smooth(0.63, 1, q);
            const attached = Math.min(
                bend,
                edge(u, side) + half * 0.79 + clearance
            );
            return { x: axis(u) + side * attached, left: half, right: half };
        },
        12
    );
}

/** All renderers use the same small vector frame, including the preview canvas. */
export function streakFlameFrame(days: number, elapsed: number) {
    const tier = tiers[levelFor(days)];
    const { width, height, pulse } = tier;
    const t = elapsed + tier.phase;
    const flares = tier.flares.map((profile) => liveFlare(profile, t));
    const drive = Math.min(
        1,
        flares.reduce((sum, flare) => sum + flare.strength * flare.height, 0)
    );
    const rolls = Array.from({ length: tier.rolls }, (_, index) => {
        const period = [975, 1270, 842, 1115][index];
        const age = (t / period + index * 0.317) % 1;
        return {
            side: index % 2 === 0 ? -1 : 1,
            at: 0.19 + age * 0.74,
            strength:
                smooth(0.04, 0.25, age) * (1 - smooth(0.59, 1, age)) * pulse,
        };
    });
    const airflow = Math.sin(t / 302 + 0.33);
    const peak =
        height *
        (1 +
            (0.033 + pulse * 0.071) *
                (Math.sin(t / 153) * 0.63 + Math.sin(t / 88 + 0.6) * 0.37) +
            drive * pulse * 0.087);
    const axis = (u: number): number => {
        const twist =
            0.27 * Math.sin(t / 166 - u * 6.4) +
            0.073 * Math.sin(t / 87 - u * 11 + 1.4);
        return (
            center +
            width * Math.pow(u, 1.42) * (airflow * 0.38 + twist * pulse)
        );
    };
    const edge = (u: number, side: number): number => {
        let fold = 0;
        for (const roll of rolls) {
            const expansion = bell(u, roll.at, 0.121);
            const neck = bell(u, roll.at - 0.115, 0.067);
            fold +=
                roll.strength *
                (side === roll.side ? 1 : 0.24) *
                (0.23 * expansion - 0.58 * neck);
        }
        return (
            width *
            crossSection(u) *
            Math.max(0.38, 1 + smooth(0.14, 0.35, u) * fold)
        );
    };

    let outer = contour(
        base,
        peak,
        (u) => ({
            x: axis(u),
            left: edge(u, -1),
            right: edge(u, 1),
        }),
        20
    );
    const innerHeight = peak * (0.78 + Math.sin(t / 178 + 0.9) * 0.046);
    let inner = contour(
        base - 0.7,
        innerHeight,
        (u) => {
            const sourceHeight = (u * innerHeight) / peak;
            const section = crossSection(u) * (0.77 - 0.12 * u);
            const offset =
                width * Math.sin(t / 147 - u * 5.2 + 0.7) * section * 0.12;
            return {
                x: axis(sourceHeight) + offset,
                left:
                    edge(sourceHeight, -1) * 0.64 * (1 - u) +
                    width * section * u,
                right:
                    edge(sourceHeight, 1) * 0.7 * (1 - u) + width * section * u,
            };
        },
        16
    );

    // Each flare is rooted at the edge of the same convective column.
    for (const flare of flares) {
        if (flare.strength <= 0.015) continue;
        outer += flareContour(flare, peak, width, axis, edge);
        inner += flareContour(flare, peak, width, axis, edge, true);
    }

    const coreHeight =
        peak * (0.31 + Math.sin(t / 166 + 0.6) * 0.032 + drive * 0.042);
    const core = contour(
        base - 1.25,
        coreHeight,
        (u) => {
            const x =
                axis((u * coreHeight) / peak) -
                width * Math.sin(u * 2.6 - t / 210) * u * 0.13;
            const narrow = width * 0.52 * crossSection(u);
            return { x, left: narrow, right: narrow * (1 - u * 0.21) };
        },
        10
    );
    const highlight = contour(
        base - 1.6,
        coreHeight * 0.54,
        (u) => {
            const x = axis((u * coreHeight * 0.54) / peak) + width * u * 0.1;
            const narrow = width * 0.31 * crossSection(u);
            return { x, left: narrow, right: narrow };
        },
        8
    );

    let sparks = "";
    const tipX = axis(1);
    for (let index = 0; elapsed > 0 && index < tier.sparks; index++) {
        const period = 1120 + ((index * 163) % 570);
        const age = (t / period + index * 0.382 + 0.69) % 1;
        const opacity =
            smooth(0.025, 0.17, age) * (1 - smooth(0.48, 0.97, age));
        if (opacity < 0.15) continue;
        const side = index % 2 ? 1 : -1;
        const drift = Math.sin(age * 4.8 + index) * width * 0.11 * age;
        const x =
            mix(center, tipX, 0.64 + age * 0.36) +
            side * width * (0.31 - 0.15 * age) +
            drift;
        const y = base - height * (0.67 + 0.45 * age) - (index % 3) * 2.1;
        const size =
            (1.42 - age * 0.74) * (index % 3 === 0 ? 1.23 : 0.9) * opacity;
        sparks += `M${point(x, y)}Q${point(x + size, y + size)} ${point(x, y + size * 2.6)}
          Q${point(x - size * 0.7, y + size)} ${point(x, y)}Z`;
    }
    return { outer, inner, core, highlight, sparks, drive };
}

export function streakFlamePalette(days: number) {
    const level = levelFor(days);
    const heat = clamp((days - 1) / 35 + level * 0.085);
    const color = (
        start: number,
        end: number,
        saturation: number,
        lightness: number
    ) =>
        `hsl(${Math.round(mix(start, end, heat))}, ${saturation}%, ${lightness}%)`;
    const { width, height } = tiers[level];
    return {
        width,
        height,
        edge: [
            color(22, 16, 99, 61),
            color(16, 10, 98, 51),
            color(12, 7, 91, 35),
        ],
        body: [
            color(27, 20, 100, 57),
            color(29, 24, 100, 57),
            color(18, 15, 100, 47),
        ],
        core: ["#ff952d", "#ffb545", "#ffd173"],
        highlight: ["#ffca65", "#ffe7a4"],
        spark: "#ff9950",
        glow: "#ff4c14",
    };
}
