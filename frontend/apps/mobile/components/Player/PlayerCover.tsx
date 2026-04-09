import { COLORS } from "@/constants/theme";
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
        case "song":
            return 1;
        default:
            return 1;
    }
}

function getBorderRadius(mediaType: string | undefined): number {
    switch (mediaType) {
        case "video":
            return 10;
        case "radio":
            return 999;
        default:
            return 14;
    }
}

export default function PlayerCover({
    uri,
    mediaType,
    size = 300,
}: PlayerCoverProps) {
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

const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
        backgroundColor: COLORS.bgCard,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    image: {
        width: "100%",
        height: "100%",
    },
});
