import { useState } from "react";
import { listOfflineSongRecords } from "@rockit/platform-browser/offline/db";
import { removeOfflineSong } from "@rockit/platform-browser/offline/store";
import { IconButton, MediaArtwork, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { ArrowLeft, HardDrive, Trash2 } from "@rockit/ui/icons";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { useVocabulary } from "@/lib/vocabulary";

function OfflineCover({ publicId, name }: { publicId: string; name: string }) {
    const uri = useOfflineArtwork(publicId);
    return <MediaArtwork uri={uri} label={name} />;
}

/** Browser storage is an offline catalog, never a native filesystem browser. */
export default function StorageScreen() {
    const { vocabulary, lang } = useVocabulary();
    const theme = useDesignTheme();
    const router = useRouter();
    const resource = useAsyncResource(listOfflineSongRecords);
    const [query, setQuery] = useState("");
    const [deleteFailed, setDeleteFailed] = useState(false);
    const failed = !!resource.error || deleteFailed;
    const load = async () => {
        setDeleteFailed(false);
        await resource.refresh();
    };
    const songs = resource.data ?? [];
    const filtered = songs.filter((song) =>
        (song.name ?? song.publicId)
            .toLocaleLowerCase(lang)
            .includes(query.toLocaleLowerCase(lang))
    );
    const sizeMb =
        songs.reduce((sum, song) => sum + song.sizeBytes, 0) / 1024 / 1024;
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: theme.colors.background,
                padding: theme.spacing.lg,
                paddingTop: theme.layout.mobileContentTop,
                gap: theme.spacing.lg,
            }}
        >
            <View style={{ alignSelf: "flex-start" }}>
                <IconButton
                    label={vocabulary.RETURN_BACK_HOME}
                    onPress={() => router.back()}
                >
                    <ArrowLeft color={theme.colors.foreground} />
                </IconButton>
            </View>
            <View
                style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.xl,
                    padding: theme.spacing.xl,
                    gap: theme.spacing.md,
                }}
            >
                <HardDrive size={36} color={theme.colors.primary} />
                <Text
                    style={{
                        color: theme.colors.foreground,
                        fontSize: theme.typography.heading,
                        fontWeight: "700",
                    }}
                >
                    {vocabulary.MOBILE_STORAGE_DOWNLOADS}
                </Text>
                <Text style={{ color: theme.colors["muted-foreground"] }}>
                    {songs.length.toLocaleString(lang)}{" "}
                    {songs.length === 1 ? vocabulary.SONG : vocabulary.SONGS} ·{" "}
                    {sizeMb.toLocaleString(lang, { maximumFractionDigits: 1 })}{" "}
                    MB
                </Text>
            </View>
            <TextInput
                accessibilityLabel={vocabulary.SEARCH}
                placeholder={vocabulary.SEARCH}
                placeholderTextColor={theme.colors["muted-foreground"]}
                value={query}
                onChangeText={setQuery}
                style={{
                    backgroundColor: theme.colors.secondary,
                    color: theme.colors.foreground,
                    borderRadius: theme.radius.full,
                    padding: theme.spacing.lg,
                    fontSize: 16,
                }}
            />
            {resource.loading && (
                <ActivityIndicator color={theme.colors.primary} />
            )}
            {failed ? (
                <Pressable onPress={() => void load()}>
                    <Text style={{ color: theme.colors.destructive }}>
                        {vocabulary.MOBILE_STORAGE_LOAD_ERROR} ·{" "}
                        {vocabulary.RETRY}
                    </Text>
                </Pressable>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.publicId}
                    ListEmptyComponent={
                        <Text
                            style={{ color: theme.colors["muted-foreground"] }}
                        >
                            {query
                                ? vocabulary.MOBILE_STORAGE_NO_MATCHES
                                : resource.loading
                                  ? vocabulary.MOBILE_LOADING
                                  : vocabulary.NO_OFFLINE_MEDIA}
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                padding: theme.spacing.md,
                                marginBottom: theme.spacing.sm,
                                borderRadius: theme.radius.lg,
                                backgroundColor: theme.colors.surface,
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
