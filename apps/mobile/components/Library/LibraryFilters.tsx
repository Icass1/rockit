import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useVocabulary } from "@/lib/vocabulary";

interface LibraryFiltersProps {
    activeType: ELibraryActiveType;
    onTypeChange: (type: ELibraryActiveType) => void;
}

export default function LibraryFilters({
    activeType,
    onTypeChange,
}: LibraryFiltersProps) {
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();

    const TABS: { key: ELibraryActiveType; label: string }[] = [
        { key: ELibraryActiveType.All, label: vocabulary.ALL },
        { key: ELibraryActiveType.Offline, label: vocabulary.OFFLINE },
        { key: ELibraryActiveType.Albums, label: vocabulary.ALBUMS },
        { key: ELibraryActiveType.Playlists, label: vocabulary.PLAYLISTS },
        { key: ELibraryActiveType.Songs, label: vocabulary.SONGS },
        { key: ELibraryActiveType.Videos, label: vocabulary.VIDEOS },
        { key: ELibraryActiveType.Stations, label: vocabulary.RADIO_STATIONS },
        { key: ELibraryActiveType.Shared, label: vocabulary.SHARED_2_YOU },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {TABS.map((tab) => (
                    <Pressable
                        key={tab.key}
                        style={[
                            styles.tab,
                            activeType === tab.key && styles.tabActive,
                        ]}
                        onPress={() => onTypeChange(tab.key)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeType === tab.key && styles.tabTextActive,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            paddingVertical: theme.spacing.md,
        },
        scrollContent: {
            gap: theme.spacing.xs,
        },
        tab: {
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: theme.radius.full,
            backgroundColor: theme.legacy.bgCard,
        },
        tabActive: {
            backgroundColor: theme.legacy.white,
        },
        tabText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
        },
        tabTextActive: {
            color: theme.legacy.bg,
            fontWeight: "600",
        },
    });
