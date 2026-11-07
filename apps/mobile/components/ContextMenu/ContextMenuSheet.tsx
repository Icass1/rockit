import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ArrowLeft, ChevronRight } from "@rockit/ui/icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ContextMenuConfig } from "@/lib/ContextMenuContext";

export function ContextMenuSheetContent({
    config,
}: {
    config: ContextMenuConfig;
}) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.content}>
            {config.backAction && (
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={config.backAction}
                        style={styles.backButton}
                        hitSlop={12}
                    >
                        <ArrowLeft size={22} color={theme.legacy.white} />
                    </Pressable>
                </View>
            )}
            <View style={styles.hero}>
                {config.imageUrl ? (
                    <Image
                        source={config.imageUrl}
                        style={styles.image}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <Text style={styles.title} numberOfLines={2}>
                    {config.title}
                </Text>
                {config.subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {config.subtitle}
                    </Text>
                )}
            </View>
            <View style={styles.separator} />
            {config.options.map((option, index) => (
                <Pressable
                    key={`${option.label}-${index}`}
                    style={({ pressed }) => [
                        styles.option,
                        pressed && styles.optionPressed,
                    ]}
                    onPress={option.onPress}
                >
                    <option.icon
                        size={20}
                        color={
                            option.destructive
                                ? theme.legacy.accent
                                : theme.legacy.white
                        }
                    />
                    <Text
                        style={[
                            styles.optionLabel,
                            option.destructive && styles.optionLabelDestructive,
                        ]}
                    >
                        {option.label}
                    </Text>
                    {option.showArrow && (
                        <ChevronRight
                            size={16}
                            color={theme.legacy.gray600}
                            style={styles.optionChevron}
                        />
                    )}
                </Pressable>
            ))}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        content: { paddingBottom: theme.spacing.page },
        headerRow: {
            paddingHorizontal: 20,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.xs,
        },
        backButton: { alignSelf: "flex-start", padding: theme.spacing.xs },
        hero: {
            alignItems: "center",
            paddingHorizontal: theme.spacing.xl,
            paddingTop: 20,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.md,
        },
        image: {
            width: 160,
            height: 160,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.legacy.bgCardLight,
        },
        imagePlaceholder: { backgroundColor: theme.legacy.bgCardLight },
        title: {
            color: theme.legacy.white,
            fontSize: 20,
            fontWeight: "700",
            textAlign: "center",
        },
        subtitle: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
            textAlign: "center",
        },
        separator: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.legacy.gray800,
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
        },
        option: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            gap: theme.spacing.lg,
        },
        optionPressed: { backgroundColor: theme.legacy.bgCardLight },
        optionLabel: {
            flex: 1,
            color: theme.legacy.white,
            fontSize: theme.typography.label,
        },
        optionLabelDestructive: { color: theme.legacy.accent },
        optionChevron: { marginLeft: "auto" },
    });
