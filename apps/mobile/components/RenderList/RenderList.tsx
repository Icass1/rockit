import { memo, type ReactNode } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import type {
    BaseArtistResponse,
    CollectionPager,
    TMedia,
} from "@rockit/shared";
import {
    FeaturedArtwork,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";
import CollectionArtworkPlay from "@/components/RenderList/CollectionArtworkPlay";
import VirtualCollectionList from "@/components/RenderList/VirtualCollectionList";

interface RenderListProps {
    title: string;
    featuredKind?: string;
    subtitle?: string;
    imageUrl: string;
    artists?: BaseArtistResponse[];
    media: TMedia[];
    showMediaIndex?: boolean;
    showMediaImage?: boolean;
    substractArtists?: string[];
    listPublicId?: string;
    expandedByMediaId?: Record<string, boolean>;
    pager: CollectionPager;
    total?: number;
    offset?: number;
    /** Rendered after the media list, inside the same scroll view. */
    footer?: ReactNode;
}

export default memo(function RenderList({
    title,
    featuredKind,
    subtitle,
    imageUrl,
    artists = [],
    media,
    showMediaIndex = false,
    showMediaImage = true,
    substractArtists = [],
    listPublicId,
    pager,
    total,
    footer,
}: RenderListProps) {
    const services = usePlayerServices();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const artistNames = artists.map((a) => a.name).join(", ");

    return (
        <View style={styles.container}>
            <VirtualCollectionList
                pager={pager}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
                substractArtists={substractArtists}
                footer={footer}
                header={
                    <>
                        <View style={styles.header}>
                            <LinearGradient
                                colors={[theme.legacy.bgCard, "transparent"]}
                                style={styles.gradient}
                            />
                            <CollectionArtworkPlay
                                key={pager.publicId}
                                onPlay={() =>
                                    void services.queueManager.playCollection(
                                        pager.publicId
                                    )
                                }
                            >
                                {featuredKind ? (
                                    <FeaturedArtwork
                                        kind={featuredKind}
                                        label={title}
                                        size={theme.layout.collectionArtwork}
                                    />
                                ) : (
                                    <Image
                                        source={{
                                            uri:
                                                imageUrl ||
                                                PLACEHOLDER.playlist,
                                        }}
                                        style={styles.coverImage}
                                        contentFit="cover"
                                    />
                                )}
                            </CollectionArtworkPlay>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title} numberOfLines={5}>
                                    {title}
                                </Text>
                                {artistNames && (
                                    <Text
                                        style={styles.artistText}
                                        numberOfLines={5}
                                    >
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
                                    {Math.max(total ?? 0, media.length)}{" "}
                                    {media.length === 1
                                        ? vocabulary.SONG
                                        : vocabulary.SONGS}
                                </Text>
                            </View>
                        </View>
                    </>
                }
            />
        </View>
    );
});

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        listContent: {
            paddingBottom: 120,
        },
        header: {
            alignItems: "center",
            paddingTop: theme.layout.mobileContentTop,
            paddingBottom: theme.spacing.xl,
            paddingHorizontal: 20,
        },
        gradient: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 200,
        },
        coverImage: {
            width: theme.layout.collectionArtwork,
            height: theme.layout.collectionArtwork,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.legacy.bgCard,
        },
        titleContainer: {
            width: "100%",
            alignItems: "center",
            marginTop: 20,
        },
        title: {
            color: theme.legacy.white,
            fontSize: 22,
            fontWeight: "700",
            textAlign: "center",
        },
        artistText: {
            textAlign: "center",
            maxWidth: "100%",
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
            marginTop: theme.spacing.xs,
        },
        extraSubtitle: {
            color: theme.legacy.gray400,
            fontSize: 13,
            marginTop: 2,
        },
        mediaCount: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.caption,
            marginTop: theme.spacing.sm,
        },
        mediaContainer: {
            flexDirection: "column",
            paddingVertical: 10,
            paddingHorizontal: 10,
            gap: theme.spacing.md,
        },
    });
