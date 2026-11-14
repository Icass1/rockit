"use client";

import type { Vocabulary } from "@rockit/shared";
import { ActionButton } from "@rockit/ui/primitives/ActionButton";
import { Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function MedalControls({
    ready,
    onFront,
    onBack,
    onReset,
    onRetry,
    vocabulary: v,
}: {
    ready: boolean;
    onFront: () => void;
    onBack: () => void;
    onReset: () => void;
    onRetry?: () => void;
    vocabulary: Vocabulary;
}) {
    const theme = useDesignTheme();
    return (
        <View style={{ gap: theme.spacing.xs, flexShrink: 0 }}>
            <Text
                style={{
                    color: theme.colors["muted-foreground"],
                    fontSize: theme.typography.caption,
                }}
            >
                {v.MEDAL_3D_TOUCH_HINT}
            </Text>
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: theme.spacing.xs,
                }}
            >
                {ready ? (
                    <>
                        <ActionButton
                            label={v.MEDAL_3D_FRONT}
                            onPress={onFront}
                        />
                        <ActionButton
                            label={v.MEDAL_3D_BACK}
                            onPress={onBack}
                        />
                        <ActionButton
                            label={v.MEDAL_3D_RESET}
                            onPress={onReset}
                        />
                    </>
                ) : onRetry ? (
                    <ActionButton label={v.MEDAL_3D_RETRY} onPress={onRetry} />
                ) : null}
            </View>
        </View>
    );
}
