"use client";

import { useState } from "react";
import type { Vocabulary } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { FlipHorizontal2, RotateCcw, RotateCw } from "@rockit/ui/icons";
import { IconButton } from "@rockit/ui/primitives/IconButton";
import { View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** A compact overlay; the stage keeps its own gesture area below these touch targets. */
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
    const [reverse, setReverse] = useState(false);
    if (!ready && !onRetry) return null;
    const icon = {
        size: theme.typography.subtitle,
        color: theme.colors["recap-foreground"],
    };
    return (
        <View
            testID="medal-controls"
            style={{
                position: "absolute",
                bottom: theme.spacing.md,
                right: theme.spacing.md,
                zIndex: 1,
                flexDirection: "row",
                gap: theme.spacing.xs,
                padding: theme.spacing.xs,
                borderRadius: theme.radius.full,
                backgroundColor: withAlpha(theme.colors["medal-stage"], 0.86),
                borderWidth: 1,
                borderColor: withAlpha(
                    theme.colors["medal-silver-highlight"],
                    0.2
                ),
            }}
        >
            {ready ? (
                <>
                    <IconButton
                        label={reverse ? v.MEDAL_3D_FRONT : v.MEDAL_3D_BACK}
                        onPress={() => {
                            if (reverse) onFront();
                            else onBack();
                            setReverse(!reverse);
                        }}
                    >
                        <FlipHorizontal2 {...icon} />
                    </IconButton>
                    <IconButton
                        label={v.MEDAL_3D_RESET}
                        onPress={() => {
                            onReset();
                            setReverse(false);
                        }}
                    >
                        <RotateCcw {...icon} />
                    </IconButton>
                </>
            ) : onRetry ? (
                <IconButton label={v.MEDAL_3D_RETRY} onPress={onRetry}>
                    <RotateCw {...icon} />
                </IconButton>
            ) : null}
        </View>
    );
}
