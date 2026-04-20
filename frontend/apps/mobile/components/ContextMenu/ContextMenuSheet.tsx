import { useCallback, type RefObject } from "react";
import { COLORS } from "@/constants/theme";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
    type BottomSheetModal as BottomSheetModalType,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ContextMenuConfig } from "@/lib/ContextMenuContext";

const SNAP_POINTS = ["85%"];

interface ContextMenuSheetProps {
    config: ContextMenuConfig | null;
    sheetRef: RefObject<BottomSheetModalType | null>;
}

export default function ContextMenuSheet({
    config,
    sheetRef,
}: ContextMenuSheetProps) {
    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    );

    return (
        <BottomSheetModal
            ref={sheetRef}
            snapPoints={SNAP_POINTS}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.handle}
            style={styles.modal}
        >
            <BottomSheetScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {config && (
                    <>
                        {/* Header row: optional back button */}
                        {config.backAction && (
                            <View style={styles.headerRow}>
                                <Pressable
                                    onPress={config.backAction}
                                    style={styles.backButton}
                                    hitSlop={12}
                                >
                                    <ArrowLeft size={22} color={COLORS.white} />
                                </Pressable>
                            </View>
                        )}

                        {/* Image + title + subtitle */}
                        <View style={styles.hero}>
                            {config.imageUrl ? (
                                <Image
                                    source={config.imageUrl}
                                    style={styles.image}
                                    contentFit="cover"
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.image,
                                        styles.imagePlaceholder,
                                    ]}
                                />
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

                        {/* Options */}
                        {config.options.map((option, index) => (
                            <Pressable
                                key={index}
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
                                            ? COLORS.accent
                                            : COLORS.white
                                    }
                                />
                                <Text
                                    style={[
                                        styles.optionLabel,
                                        option.destructive &&
                                            styles.optionLabelDestructive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                                {option.showArrow && (
                                    <ChevronRight
                                        size={16}
                                        color={COLORS.gray600}
                                        style={styles.optionChevron}
                                    />
                                )}
                            </Pressable>
                        ))}
                    </>
                )}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    modal: {
        zIndex: 2000,
        elevation: 2000,
    },
    sheetBackground: {
        backgroundColor: COLORS.bgCard,
    },
    handle: {
        backgroundColor: COLORS.gray600,
        width: 40,
    },
    content: {
        paddingBottom: 40,
    },
    headerRow: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backButton: {
        alignSelf: "flex-start",
        padding: 4,
    },
    hero: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 24,
        gap: 12,
    },
    image: {
        width: 160,
        height: 160,
        borderRadius: 12,
        backgroundColor: COLORS.bgCardLight,
    },
    imagePlaceholder: {
        backgroundColor: COLORS.bgCardLight,
    },
    title: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    subtitle: {
        color: COLORS.gray400,
        fontSize: 14,
        textAlign: "center",
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.gray800,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 16,
    },
    optionPressed: {
        backgroundColor: COLORS.bgCardLight,
    },
    optionLabel: {
        flex: 1,
        color: COLORS.white,
        fontSize: 16,
    },
    optionLabelDestructive: {
        color: COLORS.accent,
    },
    optionChevron: {
        marginLeft: "auto",
    },
});
