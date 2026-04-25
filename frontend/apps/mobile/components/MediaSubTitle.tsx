import { isSong, isVideo, TMedia } from "@rockit/shared";
import { StyleProp, Text, TextStyle } from "react-native";

export default function MediaSubTitle({
    media,
    substractArtists,
    style,
    numberOfLines,
}: {
    media: TMedia;
    substractArtists?: string[];
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
}) {
    if (isSong(media) || isVideo(media)) {
        const artists = media.artists.filter(
            (a) => !substractArtists?.includes(a.name)
        );

        if (artists.length === 0) return null;

        return (
            <Text style={style} numberOfLines={numberOfLines}>
                {artists.map((a: { name: string }) => a.name).join(", ")}
            </Text>
        );
    } else {
        console.warn(
            "MediaSubTitle: No implementation for media type",
            media.type
        );
        return null;
    }
}
