import { useEffect, useState } from "react";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeData } from "@/hooks/useHomeData";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/lib/vocabulary";
import FeaturedCarousel from "@/components/Home/FeaturedCarousel";
import HomeHeader from "@/components/Home/HomeHeader";
import HorizontalSongRow from "@/components/Home/HorizontalSongRow";
import QuickSelectionsGrid from "@/components/Home/QuickSelectionsGrid";
import Header, { HEADER_HEIGHT } from "@/components/layout/Header";
import HorizontalScrollList from "@/components/Media/HorizontalScrollList";
import MediaCard from "@/components/Media/MediaCard";
import AutoplayDiscovery from "@/components/Recommendations/AutoplayDiscovery";

function useFadeIn(delay: number = 0) {
    const theme = useDesignTheme();
    const reduceMotion = useReducedMotion();
    const [opacity] = useState(() => new Animated.Value(0));
    const [translateY] = useState(() => new Animated.Value(20));

    useEffect(() => {
        if (reduceMotion) {
            opacity.setValue(1);
            translateY.setValue(0);
            return;
        }
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: theme.motion.slow,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: theme.motion.slow,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [opacity, translateY, delay, reduceMotion, theme.motion.slow]);

    return { opacity, transform: [{ translateY }] };
}

export default function HomeScreen() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary, isLoading } = useVocabulary();
    const { data, loading, error } = useHomeData();

    const section0 = useFadeIn(0);
    const section1 = useFadeIn(80);
    const section2 = useFadeIn(160);
    const section3 = useFadeIn(240);
    const section4 = useFadeIn(320);
    const section5 = useFadeIn(400);
    const section6 = useFadeIn(480);

    const handleSongPress = (
        song: BaseSongWithAlbumResponse,
        allSongs: BaseSongWithAlbumResponse[]
    ) => {
        void rockIt.queueManager.playRecommendedSongAsync(song, allSongs);
    };

    if (loading || isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <Header />
                <View style={styles.centerContainer}>
                    <ActivityIndicator
                        size="large"
                        color={theme.legacy.accent}
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !data) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>
                        {error ?? vocabulary.ERROR}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (
        data.isEmpty &&
        !data.recommendations?.songs.length &&
        !data.recommendations?.discover.length
    ) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>{vocabulary.NO_SONGS}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <Header />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={section0}>
                    <HomeHeader />
                </Animated.View>

                {(data.songsByTimePlayed.length > 0 ||
                    (data.recommendations?.songs.length ?? 0) > 0) && (
                    <Animated.View style={section1}>
                        <FeaturedCarousel
                            songs={
                                data.recommendations?.songs.length
                                    ? data.recommendations.songs
                                    : data.songsByTimePlayed
                            }
                            title={vocabulary.FOR_YOU}
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.recentlyClickedMedia.length > 0 && (
                    <Animated.View style={section6}>
                        <HorizontalScrollList
                            title={vocabulary.MOBILE_RECENTLY_OPENED}
                        >
                            {data.recentlyClickedMedia
                                .filter(
                                    (media) =>
                                        media.type === "album" ||
                                        media.type === "playlist" ||
                                        media.type === "song" ||
                                        media.type === "video"
                                )
                                .map((media) => (
                                    <View
                                        key={media.publicId}
                                        style={{ width: 140 }}
                                    >
                                        <MediaCard
                                            media={media}
                                            aspectRatio={1}
                                        />
                                    </View>
                                ))}
                        </HorizontalScrollList>
                    </Animated.View>
                )}

                {(data.randomSongsLastMonth.length > 0 ||
                    (data.recommendations?.songs.length ?? 0) > 0) && (
                    <Animated.View style={section2}>
                        <QuickSelectionsGrid
                            title={vocabulary.QUICK_SELECTIONS}
                            items={data.quickSelections}
                            onMediaPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.hiddenGems.length > 0 && (
                    <Animated.View style={section3}>
                        <HorizontalSongRow
                            title={vocabulary.HIDDEN_GEMS}
                            songs={data.hiddenGems}
                            listKey="hidden-gems"
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.communityTop.length > 0 && (
                    <Animated.View style={section4}>
                        <HorizontalSongRow
                            title={vocabulary.COMMUNITY_TOP}
                            songs={data.communityTop}
                            listKey="community"
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.monthlyTop.length > 0 && (
                    <Animated.View style={section5}>
                        <HorizontalSongRow
                            title={vocabulary.NAV_LAST_MONTH}
                            songs={data.monthlyTop}
                            listKey="monthly"
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.recommendations && (
                    <>
                        <HorizontalSongRow
                            title={vocabulary.FOR_YOU}
                            songs={data.recommendations.songs}
                            listKey="for-you"
                            onSongPress={handleSongPress}
                        />
                        <AutoplayDiscovery
                            items={data.recommendations.discover}
                        />
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        scrollView: {
            flex: 1,
        },
        content: {
            paddingTop: HEADER_HEIGHT,
        },
        centerContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        errorText: {
            color: theme.legacy.accent,
            fontSize: theme.typography.label,
        },
        emptyText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.label,
        },
    });
