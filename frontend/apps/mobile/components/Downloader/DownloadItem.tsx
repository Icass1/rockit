import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import type { DownloadInfo } from "@/hooks/useDownloads";

interface DownloadItemProps {
    item: DownloadInfo;
}

function getStatusColor(item: DownloadInfo): string {
    if (item.message === "Error") return COLORS.accent;
    if (item.completed === 100) return "#1cad60";
    return COLORS.accent;
}

function getStatusLabel(item: DownloadInfo): string {
    if (item.message === "Error") return "Error";
    if (item.completed === 100) return "Done";
    if (item.message === "In queue") return "Queued";
    return `${Math.round(item.completed)}%`;
}

export default function DownloadItem({ item }: DownloadItemProps) {
    const statusColor = getStatusColor(item);
    const progressWidth = item.message === "Error" ? 100 : item.completed;

    return (
        <View style={styles.container}>
            <View style={styles.imageContainer}>
                <View style={styles.imagePlaceholder} />
            </View>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.title || "Loading..."}
                    </Text>
                    <Text style={styles.status}>{getStatusLabel(item)}</Text>
                </View>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBg}>
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
        width: 36,
        height: 36,
        borderRadius: 6,
        overflow: "hidden",
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
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.white,
    },
    status: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.gray400,
    },
    progressContainer: {
        height: 4,
        overflow: "hidden",
        borderRadius: 2,
        backgroundColor: COLORS.bgCardLight,
    },
    progressBg: {
        flex: 1,
    },
    progressBar: {
        height: "100%",
        borderRadius: 2,
    },
});
