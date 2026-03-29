import { useEffect, useRef } from "react";
import { COLORS } from "@/constants/theme";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeData } from "@/hooks/useHomeData";
import { useVocabulary } from "@/lib/vocabulary";
import FeaturedCarousel from "@/components/Home/FeaturedCarousel";
import HomeHeader from "@/components/Home/HomeHeader";
import HorizontalSongRow from "@/components/Home/HorizontalSongRow";
import QuickSelectionsGrid from "@/components/Home/QuickSelectionsGrid";
import Header, { HEADER_HEIGHT } from "@/components/layout/Header";

function useFadeIn(delay: number = 0) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [opacity, translateY, delay]);

    return { opacity, transform: [{ translateY }] };
}

function getPreviousMonthName(): string {
    const MONTH_NAMES = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    return MONTH_NAMES[(new Date().getMonth() + 11) % 12];
}

export default function HomeScreen() {
    const { vocabulary, isLoading } = useVocabulary();
    const { data, loading, error } = useHomeData();

    const section0 = useFadeIn(0);
    const section1 = useFadeIn(80);
    const section2 = useFadeIn(160);
    const section3 = useFadeIn(240);
    const section4 = useFadeIn(320);
    const section5 = useFadeIn(400);

    const handleSongPress = (
        _song: BaseSongWithAlbumResponse,
        _allSongs: BaseSongWithAlbumResponse[]
    ) => {
        // TODO: Integrate with audio player when available
        // The MiniPlayer component exists but has no playback logic yet
    };

    if (loading || isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <Header />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
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
                        {error ?? vocabulary.ERROR ?? "Failed to load"}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (data.isEmpty) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        {vocabulary.NO_SONGS ?? "No music yet"}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const previousMonth = getPreviousMonthName();

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

                {data.songsByTimePlayed.length > 0 && (
                    <Animated.View style={section1}>
                        <FeaturedCarousel
                            songs={data.songsByTimePlayed}
                            title={vocabulary.YOUR_MIX || "Your Mix"}
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.randomSongsLastMonth.length > 0 && (
                    <Animated.View style={section2}>
                        <QuickSelectionsGrid
                            title={
                                vocabulary.QUICK_SELECTIONS ||
                                "Quick Selections"
                            }
                            items={data.randomSongsLastMonth}
                            onMediaPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.hiddenGems.length > 0 && (
                    <Animated.View style={section3}>
                        <HorizontalSongRow
                            title={vocabulary.HIDDEN_GEMS || "Hidden Gems"}
                            songs={data.hiddenGems}
                            listKey="hidden-gems"
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.communityTop.length > 0 && (
                    <Animated.View style={section4}>
                        <HorizontalSongRow
                            title={vocabulary.COMMUNITY_TOP || "Community Top"}
                            songs={data.communityTop}
                            listKey="community"
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                {data.monthlyTop.length > 0 && (
                    <Animated.View style={section5}>
                        <HorizontalSongRow
                            title={`${previousMonth} Recap`}
                            songs={data.monthlyTop}
                            listKey="monthly"
                            onSongPress={handleSongPress}
                        />
                    </Animated.View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
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
        color: COLORS.accent,
        fontSize: 16,
    },
    emptyText: {
        color: COLORS.gray400,
        fontSize: 16,
    },
});
