import { useEffect, useRef, useState, type ReactNode } from "react";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Play } from "@rockit/ui/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

/** A first tap reveals playback; a second confirms before the hint expires. */
export default function CollectionArtworkPlay({
    children,
    onPlay,
}: {
    children: ReactNode;
    onPlay: () => void;
}) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const [armed, setArmed] = useState(false);
    const armedRef = useRef(false);
    const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    );
    const reset = () => {
        clearTimeout(timeout.current);
        armedRef.current = false;
        setArmed(false);
    };
    useEffect(() => () => clearTimeout(timeout.current), []);

    return (
        <Pressable
            testID="collection-artwork-play"
            accessibilityRole="button"
            accessibilityLabel={vocabulary.PLAY}
            accessibilityState={{ expanded: armed }}
            onBlur={reset}
            onPress={() => {
                if (armedRef.current) {
                    reset();
                    onPlay();
                    return;
                }
                armedRef.current = true;
                setArmed(true);
                timeout.current = setTimeout(
                    reset,
                    theme.motion.collectionPlayHint
                );
            }}
            style={styles.artwork}
        >
            {children}
            {armed && (
                <View
                    testID="collection-artwork-play-overlay"
                    pointerEvents="none"
                    style={styles.overlay}
                >
                    <Play
                        size={theme.layout.touchTarget}
                        color={theme.colors["on-media"]}
                        fill={theme.colors["on-media"]}
                    />
                </View>
            )}
        </Pressable>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        artwork: {
            borderRadius: theme.radius.lg,
            shadowColor: theme.colors.backdrop,
            shadowOffset: { width: 0, height: theme.spacing.sm },
            shadowOpacity: 0.4,
            shadowRadius: theme.radius.xl,
            elevation: theme.spacing.sm,
        },
        overlay: {
            ...StyleSheet.absoluteFill,
            borderRadius: theme.radius.lg,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(theme.colors.backdrop, 0.5),
        },
    });
