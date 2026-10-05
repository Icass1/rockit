import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ContextMenuConfig } from "@/lib/ContextMenuContext";

export function ContextMenuSheetContent({ config }: { config: ContextMenuConfig }) {
    return (
        <View style={styles.content}>
            {config.backAction && (
                <View style={styles.headerRow}>
                    <Pressable onPress={config.backAction} style={styles.backButton} hitSlop={12}>
                        <ArrowLeft size={22} color={COLORS.white} />
                    </Pressable>
                </View>
            )}
            <View style={styles.hero}>
                {config.imageUrl ? (
                    <Image source={config.imageUrl} style={styles.image} contentFit="cover" />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <Text style={styles.title} numberOfLines={2}>{config.title}</Text>
                {config.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{config.subtitle}</Text>}
            </View>
            <View style={styles.separator} />
            {config.options.map((option, index) => (
                <Pressable
                    key={`${option.label}-${index}`}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                    onPress={option.onPress}
                >
                    <option.icon size={20} color={option.destructive ? COLORS.accent : COLORS.white} />
                    <Text style={[styles.optionLabel, option.destructive && styles.optionLabelDestructive]}>
                        {option.label}
                    </Text>
                    {option.showArrow && <ChevronRight size={16} color={COLORS.gray600} style={styles.optionChevron} />}
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    content: { paddingBottom: 40 },
    headerRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
    backButton: { alignSelf: "flex-start", padding: 4 },
    hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 12 },
    image: { width: 160, height: 160, borderRadius: 12, backgroundColor: COLORS.bgCardLight },
    imagePlaceholder: { backgroundColor: COLORS.bgCardLight },
    title: { color: COLORS.white, fontSize: 20, fontWeight: "700", textAlign: "center" },
    subtitle: { color: COLORS.gray400, fontSize: 14, textAlign: "center" },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.gray800, marginHorizontal: 16, marginBottom: 8 },
    option: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 24, gap: 16 },
    optionPressed: { backgroundColor: COLORS.bgCardLight },
    optionLabel: { flex: 1, color: COLORS.white, fontSize: 16 },
    optionLabelDestructive: { color: COLORS.accent },
    optionChevron: { marginLeft: "auto" },
});
