import { StyleSheet, View } from "react-native";
import { Header, PageContainer, SectionTitle } from "@/components/layout";
import {
    AccountSection,
    AudioSection,
    LanguageSection,
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
    return (
        <>
            <Header />
            <PageContainer>
                <ProfileSection />

                <SettingsSection title="Account">
                    <AccountSection />
                </SettingsSection>

                <SettingsSection title="Language">
                    <LanguageSection />
                </SettingsSection>

                <SettingsSection title="Audio">
                    <AudioSection />
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
        paddingVertical: 0,
    },
});
