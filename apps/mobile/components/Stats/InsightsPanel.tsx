import { useState } from "react";
import { statsInsightMetrics, type UserStatsRequest } from "@rockit/shared";
import { ActionButton, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Text, View } from "react-native";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";

export default function InsightsPanel({
    filter,
}: {
    filter: UserStatsRequest;
}) {
    const theme = useDesignTheme();
    const { vocabulary, lang } = useVocabulary();
    const [expanded, setExpanded] = useState(false);
    const result = useAsyncResource(
        async () => {
            const response = await Http.getUserStatsV2(filter);
            if (!response.isOk()) throw new Error(response.message);
            return response.result;
        },
        JSON.stringify(filter),
        expanded
    );
    return (
        <View style={{ gap: theme.spacing.lg }}>
            <ActionButton
                label={vocabulary.STATS_DNA}
                selected={expanded}
                onPress={() => setExpanded((value) => !value)}
            />
            {expanded && (
                <>
                    {result.loading && (
                        <Text style={{ color: theme.colors.foreground }}>
                            {vocabulary.MOBILE_LOADING}
                        </Text>
                    )}
                    {result.error && (
                        <ActionButton
                            label={vocabulary.RETRY}
                            onPress={() => void result.refresh()}
                        />
                    )}
                    {result.data &&
                        statsInsightMetrics(
                            result.data.insights,
                            vocabulary,
                            lang
                        ).map((metric) => (
                            <View
                                key={metric.key}
                                style={{
                                    padding: theme.spacing.lg,
                                    borderRadius: theme.radius.lg,
                                    backgroundColor: theme.colors.surface,
                                    gap: theme.spacing.sm,
                                }}
                            >
                                <Text
                                    style={{
                                        color: theme.colors["muted-foreground"],
                                        fontSize: theme.typography.body,
                                    }}
                                >
                                    {metric.label}
                                </Text>
                                <Text
                                    style={{
                                        color: theme.colors.foreground,
                                        fontSize: theme.typography.title,
                                    }}
                                >
                                    {metric.value}
                                </Text>
                            </View>
                        ))}
                </>
            )}
        </View>
    );
}
