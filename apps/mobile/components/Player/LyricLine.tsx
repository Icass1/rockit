import { designTokens } from "@rockit/theme";
import { type TextProps } from "react-native";
import Animated, {
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";

/** Animate emphasis without changing line geometry or wrapping. */
export default function LyricLine({
    color,
    reducedMotion,
    style,
    ...props
}: TextProps & { color: string; reducedMotion: boolean }) {
    const emphasis = useAnimatedStyle(
        () => ({
            color: withTiming(color, {
                duration: reducedMotion
                    ? 0
                    : designTokens.motion.lyricsHighlight,
            }),
        }),
        [color, reducedMotion]
    );
    return <Animated.Text {...props} style={[style, emphasis]} />;
}
