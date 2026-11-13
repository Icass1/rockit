import { useEffect, useState, type ReactNode } from "react";
import type { BaseStationResponse } from "@rockit/shared";
import { IconButton, useDesignTheme } from "@rockit/ui";
import { Minus, Plus, RotateCcw } from "@rockit/ui/icons";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import { useVocabulary } from "@/lib/vocabulary";

/** Transform one vector surface; gestures never rerender the country paths. */
export default function MapViewport({
    children,
    focusStations,
}: {
    children: ReactNode;
    focusStations?: BaseStationResponse[];
}) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const [size, setSize] = useState({ width: 0, height: 0 });
    const scale = useSharedValue(theme.layout.radioMapInitialZoom);
    const x = useSharedValue(0),
        y = useSharedValue(0);
    const startX = useSharedValue(0),
        startY = useSharedValue(0);
    const startScale = useSharedValue(1);
    const focalX = useSharedValue(0),
        focalY = useSharedValue(0);
    useEffect(() => {
        if (!focusStations?.length || !size.width || !size.height) return;
        const xs = focusStations.map((station) => (station.geoLong! + 180) * 2);
        const ys = focusStations.map((station) => (90 - station.geoLat!) * 2);
        const left = Math.min(...xs),
            right = Math.max(...xs);
        const top = Math.min(...ys),
            bottom = Math.max(...ys);
        if (right - left > 360) return;
        const unit = size.width / 720;
        const visibleTop =
            theme.layout.mobileContentTop +
            theme.layout.touchTarget +
            theme.spacing.lg;
        const visibleBottom =
            size.height * (1 - theme.layout.radioResultsPeekPercent / 100);
        const zoom = Math.max(
            1,
            Math.min(
                theme.layout.radioMapMaxZoom,
                size.width /
                    ((right - left) * unit + theme.layout.touchTarget * 2),
                Math.max(theme.layout.touchTarget, visibleBottom - visibleTop) /
                    ((bottom - top) * unit + theme.layout.touchTarget * 2)
            )
        );
        scale.value = zoom;
        x.value = -((left + right) / 2 - 360) * unit * zoom;
        y.value =
            -((top + bottom) / 2 - 155) * unit * zoom +
            (visibleTop + visibleBottom - size.height) / 2;
    }, [focusStations, size.width, size.height, theme, scale, x, y]);
    const pan = Gesture.Pan()
        .minDistance(theme.spacing.sm)
        .maxPointers(1)
        .onStart(() => {
            startX.value = x.value;
            startY.value = y.value;
        })
        .onUpdate((event) => {
            x.value = Math.max(
                (-size.width * scale.value) / 2,
                Math.min(
                    (size.width * scale.value) / 2,
                    startX.value + event.translationX
                )
            );
            y.value = Math.max(
                -size.height / 2,
                Math.min(size.height / 2, startY.value + event.translationY)
            );
        });
    const pinch = Gesture.Pinch()
        .onStart((event) => {
            startScale.value = scale.value;
            startX.value = x.value;
            startY.value = y.value;
            focalX.value = event.focalX - size.width / 2;
            focalY.value = event.focalY - size.height / 2;
        })
        .onUpdate((event) => {
            const next = Math.max(
                1,
                Math.min(
                    theme.layout.radioMapMaxZoom,
                    startScale.value * event.scale
                )
            );
            const ratio = next / startScale.value;
            scale.value = next;
            x.value =
                (startX.value - focalX.value) * ratio +
                event.focalX -
                size.width / 2;
            y.value =
                (startY.value - focalY.value) * ratio +
                event.focalY -
                size.height / 2;
        });
    const transform = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { scale: scale.value },
        ],
    }));
    const zoom = (factor: number) => {
        const next = Math.max(
            1,
            Math.min(theme.layout.radioMapMaxZoom, scale.value * factor)
        );
        const ratio = next / scale.value;
        x.value *= ratio;
        y.value *= ratio;
        scale.value = next;
    };
    return (
        <View
            testID="radio-map-viewport"
            style={{ ...StyleSheet.absoluteFill, overflow: "hidden" }}
            onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
        >
            <GestureDetector
                gesture={Gesture.Simultaneous(pan, pinch)}
                touchAction="none"
            >
                <View style={{ flex: 1 }} collapsable={false}>
                    <Animated.View
                        testID="radio-map-surface"
                        style={[
                            {
                                position: "absolute",
                                width: size.width,
                                height: (size.width * 290) / 720,
                                top:
                                    (size.height - (size.width * 290) / 720) /
                                    2,
                            },
                            transform,
                        ]}
                    >
                        {children}
                    </Animated.View>
                </View>
            </GestureDetector>
            <View
                style={{
                    position: "absolute",
                    right: theme.spacing.lg,
                    top:
                        theme.layout.mobileContentTop +
                        theme.layout.touchTarget +
                        theme.spacing.xl,
                    backgroundColor: theme.colors.secondary,
                    borderRadius: theme.radius.full,
                }}
            >
                <IconButton
                    label={vocabulary.RADIO_MAP_ZOOM_IN}
                    onPress={() => zoom(1.5)}
                >
                    <Plus color={theme.colors.foreground} />
                </IconButton>
                <IconButton
                    label={vocabulary.RADIO_MAP_ZOOM_OUT}
                    onPress={() => zoom(1 / 1.5)}
                >
                    <Minus color={theme.colors.foreground} />
                </IconButton>
                <IconButton
                    label={vocabulary.RADIO_MAP_RESET}
                    onPress={() => {
                        scale.value = theme.layout.radioMapInitialZoom;
                        x.value = 0;
                        y.value = 0;
                    }}
                >
                    <RotateCcw color={theme.colors.foreground} />
                </IconButton>
            </View>
        </View>
    );
}
