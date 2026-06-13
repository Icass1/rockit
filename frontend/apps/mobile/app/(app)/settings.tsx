import { StyleSheet, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import { Header, PageContainer, SectionTitle } from "@/components/layout";
import {
    AccountSection,
    AudioSection,
    LanguageSection,
    LogsButton,
    ProfileSection,
} from "@/components/Settings";

function SettingsSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
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

                <SettingsSection title={vocabulary.LANGUAGE}>
                    <LanguageSection />
                </SettingsSection>

                <SettingsSection title={vocabulary.DOWNLOAD_APP}>
                    <AudioSection />
                </SettingsSection>
                <SettingsSection title={vocabulary.LOGS}>
                    <LogsButton />
                </SettingsSection>
                <SettingsSection title={vocabulary.STORAGE_MANAGEMENT}>
                    <LogsButton />
                </SettingsSection>
            </PageContainer>
        </>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionContent: {
        backgroundColor: "rgba(26, 26, 26, 0.6)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(38, 38, 38, 0.8)",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
});
