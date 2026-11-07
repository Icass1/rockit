import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import { Header, PageContainer, SectionTitle } from "@/components/layout";
import {
    AccountSection,
    AudioSection,
    LanguageSection,
    LogsButton,
    ProfileSection,
    StorageButton,
} from "@/components/Settings";
import ThemeSection from "@/components/Settings/ThemeSection";

function SettingsSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.section}>
            <SectionTitle>{title}</SectionTitle>
            <View style={styles.sectionContent}>{children}</View>
        </View>
    );
}

export default function SettingsScreen() {
    const { vocabulary } = useVocabulary();

    return (
        <>
            <Header />
            <PageContainer bottomPadding={200}>
                <ProfileSection />

                <SettingsSection title={vocabulary.DISPLAY_NAME}>
                    <AccountSection />
                </SettingsSection>

                <SettingsSection title={vocabulary.SETTINGS_THEME}>
                    <ThemeSection />
                </SettingsSection>

                <SettingsSection title={vocabulary.LANGUAGE}>
                    <LanguageSection />
                </SettingsSection>

                <SettingsSection title={vocabulary.AUDIO_TRANSITIONS}>
                    <AudioSection />
                </SettingsSection>
                <SettingsSection title={vocabulary.LOGS}>
                    <LogsButton />
                </SettingsSection>
                <SettingsSection title={vocabulary.STORAGE_MANAGEMENT}>
                    <StorageButton />
                </SettingsSection>
            </PageContainer>
        </>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        section: {
            marginBottom: theme.spacing.xl,
        },
        sectionContent: {
            backgroundColor: withAlpha(theme.colors["secondary"], 0.6),
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["surface-raised"], 0.8),
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.lg,
        },
    });
