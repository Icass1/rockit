import { useDesignTheme } from "@rockit/ui";
import { Text } from "react-native";
import { interpolateColor } from "react-native-reanimated";

const segmenter =
    typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;

export default function HighlightedLyricWord({
    text,
    fill,
}: {
    text: string;
    fill: "future" | "past" | number;
}) {
    const { colors } = useDesignTheme();
    const upcoming = colors["muted-foreground"];
    const highlight = colors["foreground-strong"];
    if (typeof fill !== "number")
        return (
            <Text
                style={{
                    color:
                        fill === "past"
                            ? colors["subtle-foreground"]
                            : upcoming,
                }}
            >
                {text}
            </Text>
        );

    // Inline text keeps the same layout before, during and after the fill.
    const glyphs = segmenter
        ? Array.from(
              segmenter.segment(text.trimEnd()),
              ({ segment }) => segment
          )
        : [text];
    const position = fill * glyphs.length;
    const completed = Math.floor(position);
    const filled = glyphs.slice(0, completed).join("");
    const leading = glyphs[completed] ?? "";

    return (
        <Text style={{ color: upcoming }}>
            <Text style={{ color: highlight }}>{filled}</Text>
            {leading && (
                <Text
                    style={{
                        color: interpolateColor(
                            position - completed,
                            [0, 1],
                            [upcoming, highlight]
                        ),
                    }}
                >
                    {leading}
                </Text>
            )}
            {text.slice(filled.length + leading.length)}
        </Text>
    );
}
