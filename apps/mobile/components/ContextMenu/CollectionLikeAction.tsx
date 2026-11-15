import { useStore } from "@nanostores/react";
import { useDesignTheme } from "@rockit/ui";
import { useCollectionLikes } from "@rockit/ui/headless/useCollectionLikes";
import { Heart } from "@rockit/ui/icons";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function CollectionLikeAction({
    publicId,
}: {
    publicId: string;
}) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const session = useStore(rockIt.userManager.sessionAtom);
    const resource = useCollectionLikes(
        Http,
        publicId,
        session?.username ?? "",
        () => rockIt.userManager.sessionAtom.get() === session
    );
    const label = resource.error
        ? vocabulary.RETRY
        : resource.data?.allLiked
          ? vocabulary.COLLECTION_UNLIKE_ALL
          : vocabulary.COLLECTION_LIKE_ALL;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={
                resource.loading ||
                resource.busy ||
                resource.data?.ids.length === 0
            }
            style={{
                flexDirection: "row",
                alignItems: "center",
                padding: theme.spacing.xl,
                gap: theme.spacing.lg,
                opacity: resource.loading || resource.busy ? 0.5 : 1,
            }}
            onPress={() => {
                if (resource.error) {
                    void resource.refresh();
                    return;
                }
                void resource
                    .toggle()
                    .catch(() => toasterManager.notifyError(vocabulary.ERROR))
                    .finally(() => {
                        if (rockIt.userManager.sessionAtom.get() === session)
                            void rockIt.mediaManager.fetchLikedMedia();
                    });
            }}
        >
            {resource.loading || resource.busy ? (
                <ActivityIndicator color={theme.colors.primary} />
            ) : (
                <Heart size={20} color={theme.colors.foreground} />
            )}
            <Text
                selectable={false}
                style={{
                    flex: 1,
                    color: theme.colors.foreground,
                    fontSize: theme.typography.label,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
