import { StyleSheet, Text, View } from "react-native";
import { useDownloads } from "@/hooks/useDownloads";
import {
    DownloadEmptyState,
    DownloadGroup,
    DownloadInputBar,
    StatsPills,
} from "@/components/Downloader";
import { Header, PageContainer, SectionTitle } from "@/components/layout";
import { COLORS } from "@/constants/theme";

export default function DownloaderScreen() {
    const { groups, total, active, completed, failed, startDownload } =
        useDownloads();

    return (
        <>
            <Header />
            <PageContainer>
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Downloader</Text>
                    <Text style={styles.subtitle}>
                        Paste a Spotify or YouTube URL
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

                <SectionTitle>Downloads</SectionTitle>

                {total === 0 ? (
                    <DownloadEmptyState />
                ) : (
                    <View style={styles.groups}>
                        {groups.map((group) => (
                            <DownloadGroup key={group.id} group={group} />
                        ))}
                    </View>
                )}
            </PageContainer>
        </>
    );
}

const styles = StyleSheet.create({
    headerSection: {
        alignItems: "center",
        marginVertical: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.white,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.gray600,
        marginTop: 4,
    },
    groups: {
        gap: 8,
    },
});
