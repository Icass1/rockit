import { useState } from "react";
import { loadAnnualRecap } from "@rockit/shared";
import {
    AnnualRecap,
    IconButton,
    ListeningEmblem,
    ListeningProfile,
    useDesignTheme,
} from "@rockit/ui";
import { X } from "@rockit/ui/icons";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { Http } from "@/lib/http";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";

const renderFace = (xml: string, size: number) => (
    <SvgXml xml={xml} width={size} height={size} />
);

export default function ListeningProfileModal({
    target,
    onClose,
}: {
    target: { publicId?: string; name: string } | null;
    onClose: () => void;
}) {
    const theme = useDesignTheme();
    const { vocabulary: v, lang } = useVocabulary();
    const { friendManager } = usePlayerServices();
    const [recap, setRecap] = useState<number | null>(null);
    const year = new Date().getUTCFullYear();
    if (!target) return null;
    const label = target.publicId
        ? v.SOCIAL_PROFILE_OPEN.replace("{name}", target.name)
        : v.SOCIAL_PROFILE_SELF;
    return (
        <Modal visible animationType="slide" onRequestClose={onClose}>
            <SafeAreaView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
            >
                {recap !== null ? (
                    <AnnualRecap
                        resourceKey={`${friendManager.scopeAtom.get()}:${recap}`}
                        loadRecap={() => loadAnnualRecap(Http, recap)}
                        onSelectYear={setRecap}
                        availableYears={[year, year - 1]}
                        vocabulary={v}
                        locale={lang}
                        logoSource={require("@/assets/images/logo-banner.png")}
                        onClose={onClose}
                    />
                ) : (
                    <View accessibilityViewIsModal style={{ flex: 1 }}>
                        <View
                            style={{
                                paddingHorizontal: theme.spacing.lg,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: theme.spacing.sm,
                            }}
                        >
                            <Text
                                accessibilityRole="header"
                                style={{
                                    flex: 1,
                                    fontSize: theme.typography.body,
                                    color: theme.colors["muted-foreground"],
                                    fontWeight: "600",
                                }}
                            >
                                {label}
                            </Text>
                            <IconButton
                                label={v.MOBILE_CLOSE}
                                onPress={onClose}
                            >
                                <X color={theme.colors.foreground} />
                            </IconButton>
                        </View>
                        <ScrollView
                            contentContainerStyle={{
                                padding: theme.spacing.lg,
                                paddingBottom: theme.spacing.xl,
                            }}
                        >
                            <ListeningProfile
                                key={target.publicId ?? "self"}
                                resourceKey={`${friendManager.scopeAtom.get()}:${target.publicId ?? "self"}`}
                                loadProfile={() =>
                                    friendManager.fetchListeningProfile(
                                        target.publicId
                                    )
                                }
                                vocabulary={v}
                                recapYear={year}
                                onOpenRecap={
                                    target.publicId
                                        ? undefined
                                        : () => setRecap(year)
                                }
                                renderEmblem={(badge, size) => (
                                    <ListeningEmblem
                                        size={size}
                                        variant={badge.visualVariant}
                                        scope={badge.scope}
                                        tier={badge.tier}
                                        league={badge.league}
                                        earned={!!badge.earnedAt}
                                        renderFace={renderFace}
                                        logoSource={require("@/assets/images/logo-192.png")}
                                    />
                                )}
                            />
                        </ScrollView>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}
