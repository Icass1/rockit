"use client";

import {
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type JSX,
} from "react";

// Each softer layer only filters its transition band, not the whole header.
const LAYERS = [
    { radius: 1, top: 0.2, start: 0.5, end: 1 },
    { radius: 4, top: 0, start: 0.2, end: 0.85 },
    { radius: 16, top: null, start: 0, end: 0.55 },
] as const;
const TAIL = 64;

export default function HeaderBackdrop(): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    // Matches the initial 56px logo + 32px padding; measure for zoom/resizing.
    const [headerHeight, setHeaderHeight] = useState(88);
    useLayoutEffect(() => {
        const header = ref.current?.parentElement;
        if (!header) return;
        const update = (): void =>
            setHeaderHeight(header.getBoundingClientRect().height);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);
    const position = (fraction: number): number =>
        headerHeight * 0.75 + (headerHeight * 0.25 + TAIL) * fraction;
    return (
        <div ref={ref} aria-hidden="true" className="app-header-backdrop">
            {LAYERS.map(({ radius, top, start, end }) => {
                const offset = top === null ? 0 : position(top);
                const height = position(end) - offset;
                const local = (fraction: number): string =>
                    `${((position(fraction) - offset) / height) * 100}%`;
                return (
                    <span
                        key={radius}
                        className="app-header-blur-layer"
                        style={
                            {
                                "--header-blur-radius": `${radius}px`,
                                "--header-layer-top": `${offset}px`,
                                "--header-layer-height": `${height}px`,
                                "--header-layer-entry":
                                    top === null
                                        ? "#000 0%"
                                        : "transparent 0%, #000 10%",
                                "--header-blur-start": local(start),
                                "--header-blur-quarter": local(
                                    start + (end - start) * 0.25
                                ),
                                "--header-blur-middle": local(
                                    (start + end) / 2
                                ),
                                "--header-blur-three-quarters": local(
                                    start + (end - start) * 0.75
                                ),
                            } as CSSProperties
                        }
                    />
                );
            })}
        </div>
    );
}
