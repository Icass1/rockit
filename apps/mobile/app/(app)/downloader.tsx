import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View } from "react-native";
import { useDownloads } from "@/hooks/useDownloads";
import { useVocabulary } from "@/lib/vocabulary";
import {
    DownloadEmptyState,
    DownloadGroup,
    DownloadInputBar,
    StatsPills,
} from "@/components/Downloader";
import { PageContainer, SectionTitle } from "@/components/layout";

export default function DownloaderScreen() {
    const styles = useThemedStyles(createStyles);
    const { vocabulary, isLoading: vocabLoading } = useVocabulary();
    const {
        groups,
        total,
        active,
        completed,
        failed,
        startDownload,
        clearFailed,
    } = useDownloads();

    if (vocabLoading) {
        return (
            <>
                <PageContainer />
            </>
        );
    }

    return (
        <>
            <PageContainer>
                <View style={styles.headerSection}>
                    <Text style={styles.title}>{vocabulary.DOWNLOADS}</Text>
                    <Text style={styles.subtitle}>
                        {vocabulary.DOWNLOAD_INPUT_PLACEHOLDER}
                    </Text>
                </View>

                <DownloadInputBar onSubmit={startDownload} />

                {total > 0 && (
                    <StatsPills
                        total={total}
                        active={active.length}
                        done={completed.length}
                        failed={failed.length}
                    />
                )}

                <SectionTitle>{vocabulary.DOWNLOADS}</SectionTitle>

                {total === 0 ? (
                    <DownloadEmptyState />
                ) : (
                    <View style={styles.groups}>
                        {groups.map((group, groupIndex) => (
                            <DownloadGroup
                                key={`${group.id}-${groupIndex}`}
                                group={group}
                                onClear={
                                    group.id === "failed"
                                        ? clearFailed
                                        : undefined
                                }
                            />
                        ))}
                    </View>
                )}
            </PageContainer>
        </>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        headerSection: {
            alignItems: "center",
            marginVertical: theme.spacing.xl,
        },
        title: {
            fontSize: theme.typography.title,
            fontWeight: "bold",
            color: theme.legacy.white,
        },
        subtitle: {
            fontSize: theme.typography.body,
            color: theme.legacy.gray600,
            marginTop: theme.spacing.xs,
        },
        groups: {
            gap: theme.spacing.sm,
            paddingBottom: 124,
        },
        clearButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            marginTop: theme.spacing.sm,
        },
        clearButtonText: {
            fontSize: 13,
            color: theme.legacy.gray400,
        },
    });
