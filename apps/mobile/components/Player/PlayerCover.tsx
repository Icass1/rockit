import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

interface PlayerCoverProps {
    uri: string | undefined;
    mediaType: string | undefined;
    size?: number;
}

function getAspectRatio(mediaType: string | undefined): number {
    switch (mediaType) {
        case "video":
            return 16 / 9;
        default:
            return 1; // square for songs, radio, etc.
    }
}

function getBorderRadius(mediaType: string | undefined): number {
    switch (mediaType) {
        case "video":
            return 10;
        case "radio":
            return 999; // full circle for radio
        default:
            return 16;
    }
}

export default function PlayerCover({
    uri,
    mediaType,
    size = 300,
}: PlayerCoverProps) {
    const styles = useThemedStyles(createStyles);
    const aspectRatio = getAspectRatio(mediaType);
    const borderRadius = getBorderRadius(mediaType);
    const height = size / aspectRatio;

    return (
        <View style={[styles.container, { width: size, height, borderRadius }]}>
            <Image
                source={
                    uri
                        ? { uri }
                        : require("@/assets/images/song-placeholder.png")
                }
                style={[styles.image, { borderRadius }]}
                contentFit="cover"
                transition={300}
            />
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            overflow: "hidden",
            backgroundColor: theme.legacy.bgCard,
            shadowColor: theme.colors["backdrop"],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
            elevation: 14,
        },
        image: {
            width: "100%",
            height: "100%",
        },
    });
