import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import { useDownloads } from "@/hooks/useDownloads";
import { useVocabulary } from "@/lib/vocabulary";
import {
    DownloadEmptyState,
    DownloadGroup,
    DownloadInputBar,
    StatsPills,
} from "@/components/Downloader";
import { Header, PageContainer, SectionTitle } from "@/components/layout";

export default function DownloaderScreen() {
    const { vocabulary } = useVocabulary();
    const { groups, total, active, completed, failed, startDownload } =
        useDownloads();

    return (
        <>
            <Header />
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
                            />
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
