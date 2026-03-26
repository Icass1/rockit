import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface MediaCardProps {
    imageUrl?: string | null;
    title: string;
    subtitle?: string;
    href?: string;
    onPress?: () => void;
    aspectRatio?: number;
    placeholderUrl?: number;
    showContextMenu?: boolean;
}

export default function MediaCard({
    imageUrl,
    title,
    subtitle,
    href,
    onPress,
    aspectRatio = 1,
    placeholderUrl,
}: MediaCardProps) {
    const imageSource = imageUrl || placeholderUrl || PLACEHOLDER.song;

    const content = (
        <View style={styles.container}>
            <Image
                source={imageSource}
                style={[styles.image, aspectRatio !== 1 && { aspectRatio }]}
                contentFit="cover"
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
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
        width: "100%",
    },
    image: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 8,
        backgroundColor: COLORS.bgCard,
    },
    info: {
        marginTop: 6,
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
    pressed: {
        opacity: 0.7,
    },
});
