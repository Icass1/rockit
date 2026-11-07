import { useEffect, useRef, type CSSProperties } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { rockIt } from "@/lib/rockit/rockIt";

/** Reparent the existing element; a visual surface never creates another player. */
export default function VideoSurface({
    style,
}: {
    style?: StyleProp<ViewStyle>;
    contentFit?: "contain" | "cover" | "fill";
    nativeControls?: boolean;
    surfaceType?: "textureView" | "surfaceView";
}) {
    const host = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = host.current;
        if (!container) return;
        rockIt.mediaPlayerManager.attachVideoToContainer(container);
        return () =>
            rockIt.mediaPlayerManager.detachVideoFromContainer(container);
    }, []);
    return (
        <div ref={host} style={StyleSheet.flatten(style) as CSSProperties} />
    );
}
