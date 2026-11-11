import {
    featuredCollectionSeed,
    getRockitListName,
    loadFeaturedCollection,
    type FeaturedCollectionKey,
} from "@rockit/shared";
import { useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";
import CollectionScreen from "@/components/RenderList/CollectionScreen";

export default function FeaturedScreen({
    kind,
}: {
    kind: FeaturedCollectionKey;
}) {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const resource = useAsyncResource(
        () => loadFeaturedCollection(Http, kind),
        kind
    );
    if (resource.data)
        return (
            <CollectionScreen
                key={resource.data.publicId}
                publicId={resource.data.publicId}
                initial={featuredCollectionSeed({
                    ...resource.data,
                    name:
                        kind === "latest-downloads"
                            ? getRockitListName(kind, vocabulary)
                            : resource.data.name,
                })}
            />
        );
    return (
        <View
            style={{
                flex: 1,
                paddingTop: theme.layout.mobileContentTop,
                paddingHorizontal: theme.spacing.lg,
            }}
        >
            {resource.error ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void resource.refresh()}
                >
                    <Text style={{ color: theme.colors.destructive }}>
                        {vocabulary.ERROR} · {vocabulary.RETRY}
                    </Text>
                </Pressable>
            ) : (
                <ActivityIndicator color={theme.colors.primary} />
            )}
        </View>
    );
}
