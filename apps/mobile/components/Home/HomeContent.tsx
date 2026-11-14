import { memo } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { getPreviousMonthKey } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import QuickSelectionsGrid from "@/components/Home/QuickSelectionsGrid";
import HorizontalScrollList from "@/components/Media/HorizontalScrollList";

interface SongCardProps {
    song: BaseSongWithAlbumResponse;
}

const SongCard = memo(function SongCard({ song }: SongCardProps) {
    const styles = useThemedStyles(createStyles);
    const artistNames = song.artists.map((a) => a.name).join(", ");
    return (
        <View style={styles.songCard}>
            <Image
                source={song.imageUrl || PLACEHOLDER.song}
                style={styles.songImage}
                contentFit="cover"
            />
            <Text style={styles.songName} numberOfLines={1}>
                {song.name}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
                {artistNames}
            </Text>
        </View>
    );
});

interface SongSectionProps {
    title: string;
    songs: BaseSongWithAlbumResponse[];
}

function SongSection({ title, songs }: SongSectionProps) {
    const styles = useThemedStyles(createStyles);
    if (songs.length === 0) return null;
    return (
        <View style={styles.section}>
            <HorizontalScrollList title={title}>
                {songs.map((song) => (
                    <View key={song.publicId} style={styles.cardWrapper}>
                        <SongCard song={song} />
                    </View>
                ))}
            </HorizontalScrollList>
        </View>
    );
}

export interface HomeData {
    songsByTimePlayed: BaseSongWithAlbumResponse[];
    randomSongsLastMonth: BaseSongWithAlbumResponse[];
    hiddenGems: BaseSongWithAlbumResponse[];
    communityTop: BaseSongWithAlbumResponse[];
    monthlyTop: BaseSongWithAlbumResponse[];
    previousMonth: string;
}

interface HomeContentProps {
    data: {
        songsByTimePlayed: BaseSongWithAlbumResponse[];
        randomSongsLastMonth: BaseSongWithAlbumResponse[];
        hiddenGems: BaseSongWithAlbumResponse[];
        communityTop: BaseSongWithAlbumResponse[];
        monthlyTop: BaseSongWithAlbumResponse[];
    };
}

export default function HomeContent({ data }: HomeContentProps) {
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const previousMonth = vocabulary[getPreviousMonthKey()];

    const sections = [
        {
            key: "quick",
            title: vocabulary.QUICK_SELECTIONS,
            songs: data.randomSongsLastMonth,
        },
        {
            key: "recent",
            title: vocabulary.RECENTLY_PLAYED,
            songs: data.songsByTimePlayed,
        },
        {
            key: "hidden",
            title: vocabulary.HIDDEN_GEMS,
            songs: data.hiddenGems,
        },
        {
            key: "community",
            title: vocabulary.COMMUNITY_TOP,
            songs: data.communityTop,
        },
        {
            key: "monthly",
            title: vocabulary.HOME_MONTHLY_RECAP_TITLE.replace(
                "{month}",
                previousMonth
            ),
            songs: data.monthlyTop,
        },
    ].filter((s) => s.songs.length > 0);

    const renderItem = ({ item }: { item: (typeof sections)[0] }) => {
        if (item.key === "quick") {
            return (
                <QuickSelectionsGrid
                    title={item.title}
                    items={item.songs}
                    onMediaPress={() => {}}
                />
            );
        }
        return <SongSection title={item.title} songs={item.songs} />;
    };

    return (
        <FlatList
            data={sections}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
        />
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        listContent: { paddingBottom: 20 },
        section: { marginTop: theme.spacing.lg },
        cardWrapper: { width: 140 },
        songCard: { width: 140 },
        songImage: { width: 140, height: 140, borderRadius: theme.radius.md },
        songName: {
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            marginTop: theme.spacing.sm,
        },
        songArtist: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.caption,
            marginTop: 2,
        },
    });
