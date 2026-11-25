"use client";

import { useEffect, useId, useState } from "react";
import {
    streakFlameFrame,
    streakFlamePalette,
} from "@rockit/ui/headless/streakArtwork";
import { useMotionEnvironment } from "@rockit/ui/headless/useMotionEnvironment";
import { View } from "@rockit/ui/runtime";
import {
    ClipPath,
    Defs,
    G,
    LinearGradient,
    Path,
    RadialGradient,
    Rect,
    Stop,
    Svg,
} from "@rockit/ui/streakSvg";

const frameInterval = 1000 / 24;

export function StreakFlame({
    days,
    size = 28,
    active = true,
}: {
    days: number;
    size?: number;
    active?: boolean;
}) {
    const motion = useMotionEnvironment(active && days > 0);
    const [elapsed, setElapsed] = useState(0);
    const id = `streak-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const { outer, inner, core, highlight, sparks, drive } = streakFlameFrame(
        days,
        elapsed
    );
    const palette = streakFlamePalette(days);

    useEffect(() => {
        if (!motion) return;
        const start = performance.now();
        const timer = setInterval(() => {
            setElapsed(performance.now() - start);
        }, frameInterval);
        return () => clearInterval(timer);
    }, [motion]);

    return (
        <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            testID="streak-flame"
            style={{ width: size, height: size, flexShrink: 0 }}
        >
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient
                        id={`${id}-glow`}
                        gradientUnits="userSpaceOnUse"
                        cx={50}
                        cy={85 - palette.height * 0.22}
                        r={palette.width * 1.8}
                    >
                        <Stop
                            offset="0"
                            stopColor={palette.glow}
                            stopOpacity={0.27}
                        />
                        <Stop
                            offset="0.54"
                            stopColor={palette.glow}
                            stopOpacity={0.1}
                        />
                        <Stop
                            offset="1"
                            stopColor={palette.glow}
                            stopOpacity={0}
                        />
                    </RadialGradient>
                    <LinearGradient
                        id={`${id}-edge`}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        y1={85 - palette.height}
                        x2={0}
                        y2={91}
                    >
                        <Stop offset="0" stopColor={palette.edge[0]} />
                        <Stop offset="0.48" stopColor={palette.edge[1]} />
                        <Stop offset="1" stopColor={palette.edge[2]} />
                    </LinearGradient>
                    <LinearGradient
                        id={`${id}-body`}
                        gradientUnits="userSpaceOnUse"
                        x1={50 - palette.width}
                        y1={85 - palette.height * 0.78}
                        x2={50 + palette.width * 0.47}
                        y2={88}
                    >
                        <Stop offset="0" stopColor={palette.body[0]} />
                        <Stop offset="0.46" stopColor={palette.body[1]} />
                        <Stop offset="1" stopColor={palette.body[2]} />
                    </LinearGradient>
                    <LinearGradient
                        id={`${id}-core`}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        y1={85 - palette.height * 0.42}
                        x2={0}
                        y2={88}
                    >
                        <Stop offset="0" stopColor={palette.core[0]} />
                        <Stop offset="0.63" stopColor={palette.core[1]} />
                        <Stop offset="1" stopColor={palette.core[2]} />
                    </LinearGradient>
                    <LinearGradient
                        id={`${id}-highlight`}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        y1={85 - palette.height * 0.18}
                        x2={0}
                        y2={86}
                    >
                        <Stop
                            offset="0"
                            stopColor={palette.highlight[0]}
                            stopOpacity={0.24}
                        />
                        <Stop
                            offset="1"
                            stopColor={palette.highlight[1]}
                            stopOpacity={0.94}
                        />
                    </LinearGradient>
                    <ClipPath id={`${id}-clip`}>
                        <Path d={outer} />
                    </ClipPath>
                </Defs>
                <Rect
                    width={100}
                    height={100}
                    fill={`url(#${id}-glow)`}
                    opacity={0.83 + drive * 0.17}
                />
                <Path d={outer} fill={`url(#${id}-edge)`} />
                <G clipPath={`url(#${id}-clip)`}>
                    <Path d={inner} fill={`url(#${id}-body)`} />
                    <Path d={core} fill={`url(#${id}-core)`} />
                    <Path d={highlight} fill={`url(#${id}-highlight)`} />
                </G>
                {sparks && (
                    <Path
                        d={sparks}
                        fill={palette.spark}
                        opacity={0.71 + drive * 0.17}
                    />
                )}
            </Svg>
        </View>
    );
}
