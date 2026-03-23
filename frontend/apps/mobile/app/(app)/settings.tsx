import { COLORS } from "@/constants/theme";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Header from "@/components/layout/Header";
import {
    AccountSection,
    AudioSection,
    LanguageSection,
    ProfileSection,
} from "@/components/Settings";

function SectionTitle({ children }: { children: string }) {
    return (
        <View style={sectionStyles.titleContainer}>
            <Text style={sectionStyles.title}>{children.toUpperCase()}</Text>
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    titleContainer: {
        marginBottom: 12,
    },
    title: {
        color: COLORS.gray600,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
    },
});

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
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.profileWrapper}>
                    <ProfileSection />
                </View>

                <SettingsSection title="Account">
                    <AccountSection />
                </SettingsSection>

                <SettingsSection title="Language">
                    <LanguageSection />
                </SettingsSection>

                <SettingsSection title="Audio">
                    <AudioSection />
                </SettingsSection>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
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
    profileWrapper: {
        marginTop: 120,
    },
});
