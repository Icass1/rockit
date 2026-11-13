"use client";

import { useId, useMemo, type ComponentProps, type ReactNode } from "react";
import {
    emblemArtwork,
    emblemPalette,
} from "@rockit/ui/headless/emblemArtwork";
import { LockKeyhole } from "@rockit/ui/icons";
import { Image, Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function ListeningEmblem({
    variant,
    earned,
    tier = 1,
    league = "gold",
    size,
    logoSource = { uri: "/logo-192.png" },
    renderFace,
}: {
    variant: string;
    earned: boolean;
    tier?: number;
    league?: string;
    size?: number;
    logoSource?: ComponentProps<typeof Image>["source"];
    renderFace?: (xml: string, size: number) => ReactNode;
}) {
    const theme = useDesignTheme();
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const length = size ?? theme.layout.socialEmblemSize;
    const xml = useMemo(
        () => emblemArtwork(theme.colors, variant, earned, id, league),
        [theme.colors, variant, earned, id, league]
    );
    return (
        <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{
                width: length,
                height: length,
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {renderFace ? (
                renderFace(xml, length)
            ) : (
                <Image
                    source={{
                        uri: `data:image/svg+xml,${encodeURIComponent(xml)}`,
                    }}
                    style={{ width: length, height: length }}
                />
            )}
            <Image
                source={logoSource}
                resizeMode="contain"
                style={{
                    position: "absolute",
                    width: length * 0.22,
                    height: length * 0.22,
                    top: length * 0.45,
                    opacity: earned ? 1 : 0.45,
                }}
            />
            <Text
                style={{
                    position: "absolute",
                    bottom: length * 0.16,
                    color: emblemPalette(theme.colors, league, earned)
                        .highlight,
                    fontSize: length * 0.13,
                    fontWeight: "700",
                }}
            >
                {tier}
            </Text>
            {!earned && (
                <View
                    style={{
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        backgroundColor: theme.colors.background,
                    }}
                >
                    <LockKeyhole
                        size={theme.typography.caption}
                        color={theme.colors["muted-foreground"]}
                    />
                </View>
            )}
        </View>
    );
}
