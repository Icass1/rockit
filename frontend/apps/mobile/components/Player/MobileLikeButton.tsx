// MobileLikeButton.tsx – React Native implementation of the web LikeButton with hand+flame animation
// This component mirrors the behaviour of the web LikeButton but uses RN primitives.

import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { Heart } from "lucide-react-native";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
// Use built‑in easing definitions
import { rockIt } from "@/lib/rockit/rockIt";

type FlameState = "hidden" | "enter" | "visible" | "exit";

const FLAME_DURATION_MS = 1000;

export default function MobileLikeButton({
    mediaPublicId,
}: {
    mediaPublicId: string;
}) {
    // Atom that holds an array of liked media public ids
    const $liked = useStore(rockIt.mediaManager.likedMediaAtom);
    const isLiked = $liked.includes(mediaPublicId);

    const [flameState, setFlameState] = useState<FlameState>("hidden");
    const prevLiked = useRef(isLiked);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animation values (opacity + scale) for the flame wrapper
    const flameOpacity = useRef(new Animated.Value(0)).current;
    const flameScale = useRef(new Animated.Value(0.4)).current;
    const handTilt = useRef(new Animated.Value(0)).current; // rotation in degrees

    // ---------------------------------------------------------------------
    // React to like state changes – trigger entry animation when a track becomes liked
    // ---------------------------------------------------------------------
    useEffect(() => {
        if (prevLiked.current === isLiked) return;
        prevLiked.current = isLiked;
        if (isLiked) {
            setFlameState("enter");
        } else {
            // If unliked, hide immediately (no exit flame animation needed)
            setFlameState("hidden");
        }
    }, [isLiked]);

    // ---------------------------------------------------------------------
    // Flame animation sequencer – enter → visible → exit → hidden
    // ---------------------------------------------------------------------
    useEffect(() => {
        if (flameState === "enter") {
            // Fade‑in + scale‑up (mirrors CSS keyframes)
            Animated.parallel([
                Animated.timing(flameOpacity, {
                    toValue: 1,
                    duration: 350,
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(flameScale, {
                    toValue: 1,
                    duration: 350,
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setFlameState("visible");
            });
        } else if (flameState === "visible") {
            // Auto‑dismiss after a short visible period
            dismissTimer.current = setTimeout(() => {
                setFlameState("exit");
            }, FLAME_DURATION_MS);
        } else if (flameState === "exit") {
            // Fade‑out + shrink (mirrors CSS exit animation)
            Animated.parallel([
                Animated.timing(flameOpacity, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(flameScale, {
                    toValue: 0.3,
                    duration: 250,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ]).start(() => setFlameState("hidden"));
        }
        return () => {
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
        };
    }, [flameState, flameOpacity, flameScale]);

    // ---------------------------------------------------------------------
    // Hand‑tilt animation – short rotation when the button is pressed
    // ---------------------------------------------------------------------
    const handlePress = () => {
        rockIt.mediaManager.toggleLikeMedia(mediaPublicId);
        Animated.sequence([
            Animated.timing(handTilt, {
                toValue: -18,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(handTilt, {
                toValue: 14,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(handTilt, {
                toValue: 0,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // ---------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------
    return (
        <View style={styles.container}>
            {/* Flame wrapper – invisible when hidden */}
            {flameState !== "hidden" && (
                <Animated.View
                    style={[
                        styles.flameWrapper,
                        {
                            opacity: flameOpacity,
                            transform: [{ scale: flameScale }],
                        },
                    ]}
                >
                    {/* Flame layers – reproducing the CSS colours */}
                    <View style={styles.flameContainer}>
                        <View style={[styles.flame, styles.red]} />
                        <View style={[styles.flame, styles.orange]} />
                        <View style={[styles.flame, styles.yellow]} />
                        <View style={[styles.flame, styles.white]} />
                        <View style={[styles.circle, styles.blue]} />
                    </View>
                </Animated.View>
            )}

            {/* Clickable heart‑like icon */}
            <Pressable onPress={handlePress} style={styles.button} hitSlop={12}>
                <Animated.View
                    style={{
                        transform: [
                            {
                                rotate: handTilt.interpolate({
                                    inputRange: [-180, 180],
                                    outputRange: ["-180deg", "180deg"],
                                }),
                            },
                        ],
                    }}
                >
                    <Heart
                        size={22}
                        color={isLiked ? "#202020" : "#A1A1AA"}
                        fill={isLiked ? "#202020" : "transparent"}
                    />
                </Animated.View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    button: {
        width: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    // -----------------------------------------------------------------
    // Flame – dimensions are taken from the web CSS (20 × 20 wrapper)
    // -----------------------------------------------------------------
    flameWrapper: {
        position: "absolute",
        width: 20,
        height: 20,
        left: "50%",
        top: "55%",
        transform: [{ translateX: -10 }, { translateY: -10 }], // centre it
        pointerEvents: "none",
    },
    flameContainer: {
        flex: 1,
        width: 20,
        height: 20,
        position: "relative",
        transformOrigin: "center bottom",
    },
    flame: {
        position: "absolute",
        bottom: 0,
        borderBottomRightRadius: 999,
        borderBottomLeftRadius: 999,
        borderTopLeftRadius: 999,
        transform: [{ rotate: "-45deg" }, { scaleX: 1.5 }, { scaleY: 1.5 }],
    },
    red: {
        left: 1.7,
        width: 16.7,
        height: 16.7,
        backgroundColor: "#ee1086",
        shadowColor: "#ee1086",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1.3,
    },
    orange: {
        left: 3.3,
        width: 13.3,
        height: 13.3,
        backgroundColor: "#f53a76",
        shadowColor: "#f53a76",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1.3,
    },
    yellow: {
        left: 5,
        width: 10,
        height: 10,
        backgroundColor: "#fb6467",
        shadowColor: "#fb6467",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1.3,
    },
    white: {
        left: 5,
        bottom: -1.3,
        width: 10,
        height: 10,
        backgroundColor: "#ffaacc",
        shadowColor: "#ffaacc",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 2,
    },
    circle: {
        position: "absolute",
        borderRadius: 999,
        width: 3.3,
        height: 3.3,
        left: 8.3,
        bottom: -6,
        backgroundColor: "white",
        shadowColor: "white",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 3.3,
    },
    blue: {}, // uses the generic circle style above
});
