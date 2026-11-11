import { useState } from "react";
import { listOfflineSongRecords } from "@rockit/platform-browser/offline/db";
import { removeOfflineSong } from "@rockit/platform-browser/offline/store";
import { IconButton, MediaArtwork, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { ArrowLeft, Trash2 } from "@rockit/ui/icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { useVocabulary } from "@/lib/vocabulary";

function OfflineCover({ publicId, name }: { publicId: string; name: string }) {
    const uri = useOfflineArtwork(publicId);
    return <MediaArtwork uri={uri} label={name} />;
}

/** Browser storage is an offline catalog, never a native filesystem browser. */
export default function StorageScreen() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const router = useRouter();
    const resource = useAsyncResource(listOfflineSongRecords);
    const [deleteFailed, setDeleteFailed] = useState(false);
    const failed = !!resource.error || deleteFailed;
    const load = async () => {
        setDeleteFailed(false);
        await resource.refresh();
    };
    const songs = resource.data ?? [];
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: theme.colors.background,
                padding: theme.spacing.lg,
            }}
        >
            <IconButton
                label={vocabulary.RETURN_BACK_HOME}
                onPress={() => router.back()}
            >
                <ArrowLeft color={theme.colors.foreground} />
            </IconButton>
            <Text
                style={{
                    color: theme.colors.foreground,
                    fontSize: theme.typography.title,
                }}
            >
                {vocabulary.MOBILE_STORAGE_DOWNLOADS}
            </Text>
            {failed ? (
                <Pressable onPress={() => void load()}>
                    <Text style={{ color: theme.colors.destructive }}>
                        {vocabulary.MOBILE_STORAGE_LOAD_ERROR} ·{" "}
                        {vocabulary.RETRY}
                    </Text>
                </Pressable>
            ) : (
                <FlatList
                    data={songs}
                    keyExtractor={(item) => item.publicId}
                    ListEmptyComponent={
                        <Text
                            style={{ color: theme.colors["muted-foreground"] }}
                        >
                            {vocabulary.NO_OFFLINE_MEDIA}
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: theme.spacing.md,
                                gap: theme.spacing.md,
                            }}
                        >
                            <OfflineCover
                                publicId={item.publicId}
                                name={item.name ?? item.publicId}
                            />
                            <Text
                                style={{
                                    flex: 1,
                                    color: theme.colors.foreground,
                                }}
                            >
                                {item.name ?? item.publicId}
                            </Text>
                            <IconButton
                                label={vocabulary.REMOVE_OFFLINE}
                                onPress={() => {
                                    void removeOfflineSong(item.publicId)
                                        .then(load)
                                        .catch(() => setDeleteFailed(true));
                                }}
                            >
                                <Trash2 color={theme.colors.destructive} />
                            </IconButton>
                        </View>
                    )}
                />
            )}
        </View>
    );
}
