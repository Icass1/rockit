import { useEffect, useState } from "react";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Animated, StyleSheet, View } from "react-native";

interface MediaCardSkeletonProps {
    width?: number;
}

export default function MediaCardSkeleton({
    width = 140,
}: MediaCardSkeletonProps) {
    const styles = useThemedStyles(createStyles);
    const [opacity] = useState(() => new Animated.Value(0.3));

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <View style={[styles.container, { width }]}>
            <Animated.View
                style={[
                    styles.image,
                    { width: width - 16, aspectRatio: 1 },
                    { opacity },
                ]}
            />
            <Animated.View
                style={[styles.title, { width: width - 24 }, { opacity }]}
            />
            <Animated.View
                style={[styles.subtitle, { width: width - 32 }, { opacity }]}
            />
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: theme.spacing.sm,
        },
        image: {
            backgroundColor: theme.legacy.bgCardLight,
            borderRadius: theme.radius.md,
        },
        title: {
            height: 14,
            backgroundColor: theme.legacy.bgCardLight,
            borderRadius: theme.radius.sm,
            marginTop: theme.spacing.sm,
        },
        subtitle: {
            height: 12,
            backgroundColor: theme.legacy.bgCardLight,
            borderRadius: theme.radius.sm,
            marginTop: theme.spacing.xs,
        },
    });
