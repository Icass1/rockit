"use client";

import { useState } from "react";
import { Image, StyleSheet, Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** Session-backed avatar with a stable initial fallback, shared by both renderers. */
export function ProfileAvatar({
    imageUrl,
    name,
    size,
}: {
    imageUrl?: string | null;
    name: string;
    size?: number;
}) {
    const theme = useDesignTheme();
    const [failed, setFailed] = useState<string>();
    const length = size ?? theme.layout.touchTarget;
    return (
        <View
            accessibilityRole="image"
            accessibilityLabel={name}
            style={{
                width: length,
                height: length,
                borderRadius: theme.radius.full,
                overflow: "hidden",
                backgroundColor: theme.colors.primary,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            {imageUrl && imageUrl !== failed ? (
                <Image
                    source={{ uri: imageUrl }}
                    resizeMode="cover"
                    style={StyleSheet.absoluteFill}
                    onError={() => setFailed(imageUrl)}
                />
            ) : (
                <Text
                    style={{
                        fontSize: theme.typography.subtitle,
                        fontWeight: "600",
                        color: theme.colors["primary-foreground"],
                    }}
                >
                    {Array.from(name)[0]?.toLocaleUpperCase()}
                </Text>
            )}
        </View>
    );
}
