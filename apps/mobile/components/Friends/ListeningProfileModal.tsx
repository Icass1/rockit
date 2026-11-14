import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { loadAnnualRecap, type ListeningBadgeResponse } from "@rockit/shared";
import {
    AnnualRecap,
    IconButton,
    ListeningEmblem,
    ListeningProfile,
    MedalDetail,
    useDesignTheme,
} from "@rockit/ui";
import { X } from "@rockit/ui/icons";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { Http } from "@/lib/http";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";
import { NativeMedalInspector } from "@/components/Friends/NativeMedalInspector";

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
    const { friendManager } = usePlayerServices();
    const scope = useStore(friendManager.scopeAtom);
    return target ? (
        <ProfileModal
            key={`${scope}:${target.publicId ?? "self"}`}
            target={target}
            onClose={onClose}
        />
    ) : null;
}

function ProfileModal({
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
    const [medal, setMedal] = useState<{
        badge: ListeningBadgeResponse;
        ownerName: string;
    } | null>(null);
    const scroll = useRef<ScrollView>(null);
    const scrollY = useRef(0);
    const returnY = useRef(0);
    const backToProfile = () => {
        setMedal(null);
        const y = returnY.current;
        requestAnimationFrame(() =>
            scroll.current?.scrollTo({ y, animated: false })
        );
    };
    const close = () => (medal ? backToProfile() : onClose());
    const year = new Date().getUTCFullYear();
    if (!target) return null;
    const label = target.publicId
        ? v.SOCIAL_PROFILE_OPEN.replace("{name}", target.name)
        : v.SOCIAL_PROFILE_SELF;
    return (
        <Modal visible animationType="slide" onRequestClose={close}>
            <SafeAreaView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
            >
                {medal && (
                    <View
                        style={{
                            flex: 1,
                            minHeight: 0,
                            padding: theme.spacing.lg,
                        }}
                        accessibilityViewIsModal
                    >
                        <MedalDetail
                            locale={lang}
                            badge={medal.badge}
                            ownerName={medal.ownerName}
                            vocabulary={v}
                            onBack={backToProfile}
                        >
                            <NativeMedalInspector
                                badge={medal.badge}
                                ownerName={medal.ownerName}
                                vocabulary={v}
                                fill
                            />
                        </MedalDetail>
                    </View>
                )}
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
                    <View
                        accessibilityViewIsModal={!medal}
                        importantForAccessibility={
                            medal ? "no-hide-descendants" : "auto"
                        }
                        style={{ flex: 1, display: medal ? "none" : "flex" }}
                    >
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
                            ref={scroll}
                            onScroll={(event) => {
                                scrollY.current =
                                    event.nativeEvent.contentOffset.y;
                            }}
                            scrollEventThrottle={16}
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
                                locale={lang}
                                onInspectEmblem={(badge, ownerName) => {
                                    returnY.current = scrollY.current;
                                    setMedal({ badge, ownerName });
                                }}
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
