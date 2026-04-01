import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import type { DownloadInfo } from "@/hooks/useDownloads";

interface DownloadItemProps {
    item: DownloadInfo;
}

function getStatusColor(item: DownloadInfo): string {
    if (item.message === "Error") return "#c72e2e";
    if (item.completed >= 100 || item.message === "Done") return "#1cad60";
    return COLORS.accent;
}

function getStatusLabel(item: DownloadInfo): string {
    if (item.message === "Error") return "Error";
    if (item.completed >= 100 || item.message === "Done") return "Done";
    if (item.message === "In queue" || item.message === "Waiting")
        return item.message;
    if (item.message === "Starting" || item.message === "Fetching")
        return item.message;
    return `${Math.round(item.completed)}%`;
}

export default function DownloadItem({ item }: DownloadItemProps) {
    const statusColor = getStatusColor(item);
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
                            {item.title || "Loading..."}
                        </Text>
                        {item.subtitle ? (
                            <Text style={styles.subtitle} numberOfLines={1}>
                                {item.subtitle}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={[styles.status, { color: statusColor }]}>
                        {getStatusLabel(item)}
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

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    imageContainer: {
        width: 44,
        height: 44,
        borderRadius: 6,
        overflow: "hidden",
    },
    imageContainerFilled: {
        backgroundColor: COLORS.bgCard,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imagePlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.bgCardLight,
    },
    content: {
        flex: 1,
        gap: 6,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.white,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.gray400,
        marginTop: 2,
    },
    status: {
        fontSize: 12,
        fontWeight: "700",
        flexShrink: 0,
    },
    progressContainer: {
        height: 3,
        borderRadius: 2,
        backgroundColor: COLORS.bgCardLight,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        borderRadius: 2,
    },
});
