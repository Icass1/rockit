import { useEffect, useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Animated, StyleSheet, View } from "react-native";

interface MediaCardSkeletonProps {
    width?: number;
}

export default function MediaCardSkeleton({
    width = 140,
}: MediaCardSkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

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

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 8,
    },
    image: {
        backgroundColor: COLORS.bgCardLight,
        borderRadius: 8,
    },
    title: {
        height: 14,
        backgroundColor: COLORS.bgCardLight,
        borderRadius: 4,
        marginTop: 8,
    },
    subtitle: {
        height: 12,
        backgroundColor: COLORS.bgCardLight,
        borderRadius: 4,
        marginTop: 4,
    },
});
