"use client";

import { useId, useMemo, type ComponentProps, type ReactNode } from "react";
import { emblemArtwork } from "@rockit/ui/headless/emblemArtwork";
import { LockKeyhole } from "@rockit/ui/icons";
import { Image, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function ListeningEmblem({
    variant,
    earned,
    league = "gold",
    size,
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
