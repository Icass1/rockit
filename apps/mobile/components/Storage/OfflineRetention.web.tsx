import { useState } from "react";
import { ActionButton, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

/** Browsers expose persistence permission, not a per-song eviction deadline. */
export default function OfflineRetention() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const [busy, setBusy] = useState(false);
    const status = useAsyncResource(async () =>
        typeof navigator.storage?.persisted === "function"
            ? navigator.storage.persisted()
            : null
    );
    return (
        <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.foreground }}>
                {status.data === true
                    ? vocabulary.OFFLINE_PERSISTENT
                    : vocabulary.OFFLINE_BEST_EFFORT}
            </Text>
            <Text
                style={{
                    color: theme.colors["muted-foreground"],
                    fontSize: theme.typography.caption,
                }}
            >
                {vocabulary.OFFLINE_RETENTION_INFO}
            </Text>
            {status.data !== true &&
                typeof navigator.storage?.persist === "function" && (
                    <ActionButton
                        label={vocabulary.OFFLINE_REQUEST_PERSISTENCE}
                        disabled={busy}
                        onPress={() => {
                            setBusy(true);
                            void navigator.storage
                                .persist()
                                .catch(() => false)
                                .then(() => status.refresh())
                                .finally(() => setBusy(false));
                        }}
                    />
                )}
        </View>
    );
}
