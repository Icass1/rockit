"use client";

import { Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";
import type { EmblemInspectorProps } from "./EmblemInspector.types";

/** Native retains the collectible details without importing a browser/WebGL runtime. */
export function EmblemInspector({
    preview,
    vocabulary: v,
}: EmblemInspectorProps) {
    const theme = useDesignTheme();
    return (
        <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
            {preview}
            <Text
                style={{
                    color: theme.colors["muted-foreground"],
                    fontSize: theme.typography.caption,
                }}
            >
                {v.MEDAL_3D_UNAVAILABLE}
            </Text>
        </View>
    );
}
