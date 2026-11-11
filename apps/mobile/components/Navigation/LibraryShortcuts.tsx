import { useDesignTheme } from "@rockit/ui";
import { Download, Radio } from "@rockit/ui/icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

/** Local destinations only: listing shortcuts never downloads five playlists. */
export default function LibraryShortcuts({
    discovery = false,
}: {
    discovery?: boolean;
}) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const router = useRouter();
    const entries = discovery
        ? [
              {
                  key: "radio",
                  name: vocabulary.RADIO,
                  path: "/radio" as const,
                  Icon: Radio,
              },
          ]
        : [
              {
                  key: "downloader",
                  name: vocabulary.DOWNLOADS,
                  path: "/downloader" as const,
                  Icon: Download,
              },
          ];
    return (
        <ScrollView
            style={{ flexGrow: 0, flexShrink: 0 }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.md,
            }}
        >
            {entries.map(({ key, name, path, Icon }) => (
                <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    onPress={() => router.push(path)}
                    style={{
                        backgroundColor: theme.colors.secondary,
                        borderRadius: theme.radius.md,
                        padding: theme.spacing.md,
                        minHeight: theme.layout.touchTarget,
                        justifyContent: "center",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: theme.spacing.sm,
                        }}
                    >
                        <Icon
                            color={theme.colors.primary}
                            size={theme.typography.body}
                        />
                        <Text style={{ color: theme.colors.foreground }}>
                            {name}
                        </Text>
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
}
