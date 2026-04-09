import { memo, type ReactNode } from "react";
import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface MediaRowProps {
    imageUrl: string;
    title: string;
    subtitle?: string;
    href?: string;
    onPress?: () => void;
    imageSize?: number;
    circularImage?: boolean;
    rightElement?: ReactNode;
}

function MediaRow({
    imageUrl,
    title,
    subtitle,
    href,
    onPress,
    imageSize = 48,
    circularImage = false,
    rightElement,
}: MediaRowProps) {
    const imageSource = imageUrl;

    const imageStyle = circularImage
        ? { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }
        : { width: imageSize, height: imageSize, borderRadius: 4 };

    const content = (
        <View style={styles.container}>
            <Image
                source={imageSource}
                style={[styles.image, imageStyle]}
                contentFit="cover"
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {rightElement && (
                <View style={styles.rightElement}>{rightElement}</View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => pressed && styles.pressed}
            >
                {content}
            </Pressable>
        );
    }

    if (href) {
        return <Link href={href as any}>{content}</Link>;
    }

    return content;
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
