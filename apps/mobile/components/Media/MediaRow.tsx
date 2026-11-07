import { memo, ReactNode } from "react";
import { COLORS } from "@/constants/theme";
import {
    BaseSearchResultsItem,
    getMediaSubtitle,
    isSearchResult,
    TMedia,
} from "@rockit/shared";
import { MediaIdentity } from "@rockit/ui";
import { StyleSheet, View } from "react-native";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

interface MediaRowProps {
    media: TMedia | BaseSearchResultsItem;
    rightElement?: ReactNode;
}

function MediaRow({ media, rightElement }: MediaRowProps) {
    return (
        <MediaPressableWrapper
            media={media}
            allMedia={!isSearchResult(media) ? [media] : []}
        >
            <View style={styles.container}>
                <MediaIdentity
                    title={media.name}
                    subtitle={getMediaSubtitle(media)}
                    imageUrl={media.imageUrl}
                    round={media.type === "artist"}
                />
                {rightElement && (
                    <View style={styles.rightElement}>{rightElement}</View>
                )}
            </View>
        </MediaPressableWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 16,
        gap: 12,
    },
    image: {
        backgroundColor: COLORS.bgCard,
        width: 48,
        height: 48,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "500",
    },
    subtitle: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 2,
    },
    rightElement: {
        marginLeft: 8,
    },
    pressed: {
        opacity: 0.7,
    },
});

export default memo(MediaRow);
