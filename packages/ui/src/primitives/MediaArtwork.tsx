"use client";

import { useState } from "react";
import { Image, StyleSheet, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** Same presenter on desktop, mobile browser and native Android. */
export function MediaArtwork({
    uri,
    fallbackUri,
    label,
    size,
    round = false,
}: {
    uri?: string | null;
    fallbackUri?: string;
    label: string;
    size?: number;
    round?: boolean;
}) {
    const theme = useDesignTheme();
    const [failedUri, setFailedUri] = useState<string>();
    const [failedFallback, setFailedFallback] = useState<string>();
    const source =
        uri && uri !== failedUri
            ? uri
            : fallbackUri !== failedFallback
              ? fallbackUri
              : undefined;
    const length = size ?? theme.layout.artwork;
    const radius = round ? theme.radius.full : theme.radius.md;
    return (
        <View
            style={{
                width: length,
                height: length,
                borderRadius: radius,
                overflow: "hidden",
                backgroundColor: theme.colors.secondary,
                flexShrink: 0,
            }}
        >
            {source ? (
                <Image
                    source={{ uri: source }}
                    accessibilityLabel={label}
                    resizeMode="cover"
                    style={StyleSheet.absoluteFill}
                    onError={() =>
                        source === uri
                            ? setFailedUri(source)
                            : setFailedFallback(source)
                    }
                />
            ) : (
                <View role="img" accessibilityLabel={label} />
            )}
        </View>
    );
}
