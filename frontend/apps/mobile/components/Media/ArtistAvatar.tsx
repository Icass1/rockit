import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ArtistAvatarProps {
    imageUrl?: string | null;
    name: string;
    size?: number;
    href?: string;
    onPress?: () => void;
}

export default function ArtistAvatar({
    imageUrl,
    name,
    size = 80,
    href,
    onPress,
}: ArtistAvatarProps) {
    const imageSource = imageUrl || PLACEHOLDER.user;

    const content = (
        <View style={[styles.container, { width: size }]}>
            <Image
                source={imageSource}
                style={[
                    styles.image,
                    { width: size, height: size, borderRadius: size / 2 },
                ]}
                contentFit="cover"
            />
            <Text
                style={[styles.name, { fontSize: Math.max(12, size / 6) }]}
                numberOfLines={1}
            >
                {name}
            </Text>
        </View>
    );

    if (href) {
        return <Link href={href as any}>{content}</Link>;
    }

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => pressed && styles.pressed}
        >
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },
    image: {
        backgroundColor: COLORS.bgCard,
    },
    name: {
        color: COLORS.white,
        marginTop: 6,
        textAlign: "center",
    },
    pressed: {
        opacity: 0.7,
    },
});
