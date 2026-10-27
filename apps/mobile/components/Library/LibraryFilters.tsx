import { COLORS } from "@/constants/theme";
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
    const { vocabulary } = useVocabulary();

    const TABS: { key: ELibraryActiveType; label: string }[] = [
        { key: ELibraryActiveType.All, label: vocabulary.ALL },
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

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
    },
    scrollContent: {
        gap: 4,
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: COLORS.bgCard,
    },
    tabActive: {
        backgroundColor: COLORS.white,
    },
    tabText: {
        color: COLORS.gray400,
        fontSize: 14,
    },
    tabTextActive: {
        color: COLORS.bg,
        fontWeight: "600",
    },
});
