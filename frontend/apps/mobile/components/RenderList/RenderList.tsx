import { memo } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import type { BaseArtistResponse, TMedia } from "@rockit/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Media } from "./Media";

interface RenderListProps {
    title: string;
    subtitle?: string;
    imageUrl: string;
    artists?: BaseArtistResponse[];
    media: TMedia[];
    showMediaIndex?: boolean;
    showMediaImage?: boolean;
    substractArtists?: string[];
}

export default memo(function RenderList({
    title,
    subtitle,
    imageUrl,
    artists = [],
    media,
    showMediaIndex = false,
    showMediaImage = true,
    substractArtists = [],
}: RenderListProps) {
    const artistNames = artists.map((a) => a.name).join(", ");

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <LinearGradient
                        colors={[COLORS.bgCard, "transparent"]}
                        style={styles.gradient}
                    />
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUrl || PLACEHOLDER.playlist }}
                            style={styles.coverImage}
                            contentFit="cover"
                        />
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={2}>
                            {title}
                        </Text>
                        {artistNames && (
                            <Text style={styles.artistText} numberOfLines={1}>
                                {artistNames}
                            </Text>
                        )}
                        {subtitle && (
                            <Text
                                style={styles.extraSubtitle}
                                numberOfLines={1}
                            >
                                {subtitle}
                            </Text>
                        )}
                        <Text style={styles.mediaCount}>
                            {media.length}{" "}
                            {media.length === 1 ? "song" : "songs"}
                        </Text>
                    </View>
                </View>
                {media.map((item, index) => (
                    <Media
                        key={item.publicId}
                        media={item}
                        allMedia={media}
                        index={index}
                        showMediaIndex={showMediaIndex}
                        showMediaImage={showMediaImage}
                        substractArtists={substractArtists}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    listContent: {
        paddingBottom: 120,
    },
    header: {
        alignItems: "center",
        paddingTop: 80,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    gradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    imageContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    coverImage: {
        width: 220,
        height: 220,
        borderRadius: 12,
        backgroundColor: COLORS.bgCard,
    },
    titleContainer: {
        alignItems: "center",
        marginTop: 20,
    },
    title: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
    },
    artistText: {
        color: COLORS.gray400,
        fontSize: 14,
        marginTop: 4,
    },
    extraSubtitle: {
        color: COLORS.gray400,
        fontSize: 13,
        marginTop: 2,
    },
    mediaCount: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 8,
    },
});
