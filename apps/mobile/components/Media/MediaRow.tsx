import { memo, ReactNode } from "react";
import {
    BaseSearchResultsItem,
    getMediaSubtitle,
    isSearchResult,
    TMedia,
} from "@rockit/shared";
import { MediaIdentity, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, View } from "react-native";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { useVocabulary } from "@/lib/vocabulary";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

interface MediaRowProps {
    media: TMedia | BaseSearchResultsItem;
    rightElement?: ReactNode;
}

function MediaRow({ media, rightElement }: MediaRowProps) {
    const imageUrl = useOfflineArtwork(
        isSearchResult(media) ? undefined : media.publicId,
        media.imageUrl
    );
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    return (
        <MediaPressableWrapper
            media={media}
            allMedia={!isSearchResult(media) ? [media] : []}
        >
            <View style={styles.container}>
                <MediaIdentity
                    title={media.name}
                    explicit={
                        media.type === "song" && !isSearchResult(media)
                            ? media.explicit
                            : null
                    }
                    explicitLabel={vocabulary.CONTENT_RATING_EXPLICIT}
                    subtitle={getMediaSubtitle(media)}
                    imageUrl={imageUrl}
                    round={media.type === "artist"}
                />
                {rightElement && (
                    <View style={styles.rightElement}>{rightElement}</View>
                )}
            </View>
        </MediaPressableWrapper>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        image: {
            backgroundColor: theme.legacy.bgCard,
            width: 48,
            height: 48,
        },
        info: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            fontWeight: "500",
        },
        subtitle: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.caption,
            marginTop: 2,
        },
        rightElement: {
            marginLeft: theme.spacing.sm,
        },
        pressed: {
            opacity: 0.7,
        },
    });

export default memo(MediaRow);
