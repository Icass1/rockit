import { useEffect, useRef, type CSSProperties } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { usePlayerServices } from "@/lib/PlayerContext";

/** Reparent the existing element; a visual surface never creates another player. */
export default function VideoSurface({
    style,
}: {
    style?: StyleProp<ViewStyle>;
    contentFit?: "contain" | "cover" | "fill";
    nativeControls?: boolean;
    surfaceType?: "textureView" | "surfaceView";
}) {
    const { mediaPlayerManager } = usePlayerServices();
    const host = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = host.current;
        if (!container) return;
        mediaPlayerManager.attachVideoToContainer(container);
        return () => mediaPlayerManager.detachVideoFromContainer(container);
    }, [mediaPlayerManager]);
    return (
        <div ref={host} style={StyleSheet.flatten(style) as CSSProperties} />
    );
}
