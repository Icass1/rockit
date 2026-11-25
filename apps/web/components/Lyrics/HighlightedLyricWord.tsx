import type { JSX } from "react";

export function HighlightedLyricWord({
    text,
    fill,
}: {
    text: string;
    fill: "future" | "past" | number;
}): JSX.Element {
    if (typeof fill !== "number")
        return (
            <span
                data-word-state={fill}
                className={
                    fill === "past"
                        ? "text-subtle-foreground"
                        : "text-muted-foreground"
                }
            >
                {text}
            </span>
        );

    const edge = `${fill * 100}%`;
    const word = text.trimEnd();
    return (
        <>
            <span
                data-word-state="active"
                className="bg-clip-text text-transparent forced-colors:text-[CanvasText]"
                style={{
                    backgroundImage: `linear-gradient(90deg, var(--theme-foreground-strong) ${edge}, var(--theme-muted-foreground) ${edge})`,
                }}
            >
                {word}
            </span>
            {text.slice(word.length)}
        </>
    );
}
