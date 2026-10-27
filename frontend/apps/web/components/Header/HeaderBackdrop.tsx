import type { CSSProperties, JSX } from "react";

// Smallest first: the strongest layer fades into already softened content.
// start/end are fractions of the fade after the first 75% of the header.
const LAYERS = [
    { radius: 0.5, start: 0.8, end: 1 },
    { radius: 1, start: 0.64, end: 1 },
    { radius: 2, start: 0.48, end: 0.88 },
    { radius: 4, start: 0.32, end: 0.72 },
    { radius: 8, start: 0.16, end: 0.56 },
    { radius: 16, start: 0, end: 0.4 },
] as const;

// The layer includes a 64px tail: 75% of header = 75% of layer - 48px.
function fadePosition(fraction: number): string {
    return `calc(${75 + 25 * fraction}% - ${48 * (1 - fraction)}px)`;
}

export default function HeaderBackdrop(): JSX.Element {
    return (
        <div aria-hidden="true" className="app-header-backdrop">
            {LAYERS.map(({ radius, start, end }) => (
                <span
                    key={radius}
                    className="app-header-blur-layer"
                    style={
                        {
                            "--header-blur-radius": `${radius}px`,
                            "--header-blur-start": fadePosition(start),
                            "--header-blur-quarter": fadePosition(
                                start + (end - start) * 0.25
                            ),
                            "--header-blur-middle": fadePosition(
                                (start + end) / 2
                            ),
                            "--header-blur-three-quarters": fadePosition(
                                start + (end - start) * 0.75
                            ),
                            "--header-blur-end": fadePosition(end),
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    );
}
