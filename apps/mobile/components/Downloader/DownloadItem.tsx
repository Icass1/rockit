import type { Vocabulary } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import type { DownloadInfo } from "@/hooks/useDownloads";
import { useVocabulary } from "@/lib/vocabulary";

interface DownloadItemProps {
    item: DownloadInfo;
}

function getStatusColor(item: DownloadInfo, theme: DesignTheme): string {
    if (item.message === "Error") return theme.colors["destructive"];
    if (item.completed >= 100 || item.message === "Done")
        return theme.colors["success"];
    return theme.legacy.accent;
}

function getStatusLabel(item: DownloadInfo, vocabulary: Vocabulary): string {
    if (item.message === "Error") return vocabulary.ERROR;
    if (item.completed >= 100 || item.message === "Done")
        return vocabulary.COMPLETED;
    if (item.message === "In queue") return vocabulary.DOWNLOAD_STATUS_QUEUED;
    if (item.message === "Waiting") return vocabulary.DOWNLOAD_STATUS_WAITING;
    if (item.message === "Starting") return vocabulary.STARTING;
    if (item.message === "Fetching") return vocabulary.FETCHING;
    return `${Math.round(item.completed)}%`;
}

export default function DownloadItem({ item }: DownloadItemProps) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const statusColor = getStatusColor(item, theme);
    const completed = Number(item.completed) || 0;
    const progressWidth =
        item.message === "Error" ? 100 : Math.min(completed, 100);

    const hasImage = item.imageUrl && item.imageUrl.length > 0;

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.imageContainer,
                    hasImage && styles.imageContainerFilled,
                ]}
            >
                {hasImage ? (
                    <Image
                        source={{ uri: item.imageUrl! }}
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View style={styles.imagePlaceholder} />
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={1}>
                            {item.title || vocabulary.MOBILE_LOADING}
                        </Text>
                        {item.subtitle ? (
                            <Text style={styles.subtitle} numberOfLines={1}>
                                {item.subtitle}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={[styles.status, { color: statusColor }]}>
                        {getStatusLabel(item, vocabulary)}
                    </Text>
                </View>

                <View style={styles.progressContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${progressWidth}%`,
                                backgroundColor: statusColor,
                            },
                        ]}
                    />
                </View>
            </View>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 10,
        },
        imageContainer: {
            width: 44,
            height: 44,
            borderRadius: 6,
            overflow: "hidden",
        },
        imageContainerFilled: {
            backgroundColor: theme.legacy.bgCard,
        },
        image: {
            width: "100%",
            height: "100%",
        },
        imagePlaceholder: {
            width: "100%",
            height: "100%",
            backgroundColor: theme.legacy.bgCardLight,
        },
        content: {
            flex: 1,
            gap: 6,
        },
        header: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
        },
        titleContainer: {
            flex: 1,
        },
        title: {
            fontSize: theme.typography.body,
            fontWeight: "500",
            color: theme.legacy.white,
        },
        subtitle: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray400,
            marginTop: 2,
        },
        status: {
            fontSize: theme.typography.caption,
            fontWeight: "700",
            flexShrink: 0,
        },
        progressContainer: {
            height: 3,
            borderRadius: theme.radius.xs,
            backgroundColor: theme.legacy.bgCardLight,
            overflow: "hidden",
        },
        progressBar: {
            height: "100%",
            borderRadius: theme.radius.xs,
        },
    });
