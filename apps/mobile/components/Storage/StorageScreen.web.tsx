import { useCallback, useEffect, useRef, useState } from "react";
import {
    listOfflineSongRecords,
    offlineLibraryRevision,
} from "@rockit/platform-browser/offline/db";
import { removeOfflineSong } from "@rockit/platform-browser/offline/store";
import { IconButton, MediaArtwork, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { ArrowLeft, HardDrive, Trash2 } from "@rockit/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { rockIt } from "@/lib/rockit/rockIt";
import { listOfflineLibrarySongs } from "@/lib/storage/offlineLibrary";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import OfflineRetention from "@/components/Storage/OfflineRetention.web";

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
    const refresh = resource.refresh;
    const focusedOnce = useRef(false);
    const playRequest = useRef(0);
    const invalidatePlayback = useCallback(() => {
        playRequest.current++;
    }, []);
    useFocusEffect(
        useCallback(() => {
            if (focusedOnce.current) void refresh();
            focusedOnce.current = true;
        }, [refresh])
    );
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(() => void refresh(), 150);
        };
        const off = offlineLibraryRevision.listen(schedule);
        const visible = () => {
            if (!document.hidden) schedule();
        };
        window.addEventListener("pageshow", schedule);
        document.addEventListener("visibilitychange", visible);
        return () => {
            off();
            clearTimeout(timer);
            invalidatePlayback();
            window.removeEventListener("pageshow", schedule);
            document.removeEventListener("visibilitychange", visible);
        };
    }, [refresh, invalidatePlayback]);
    const playSaved = async (publicId: string) => {
        const request = ++playRequest.current;
        const session = rockIt.userManager.sessionAtom.get();
        try {
            const available = await listOfflineLibrarySongs([]);
            if (
                request !== playRequest.current ||
                rockIt.userManager.sessionAtom.get() !== session
            )
                return;
            const byId = new Map(
                available.map((song) => [song.publicId, song])
            );
            const selected = byId.get(publicId);
            if (!selected) {
                toasterManager.notifyError(vocabulary.NO_OFFLINE_MEDIA);
                return;
            }
            const rest = filtered.flatMap((record) =>
                record.publicId !== publicId && byId.has(record.publicId)
                    ? [byId.get(record.publicId)!]
                    : []
            );
            rockIt.queueManager.setMedia(
                [selected, ...rest],
                "offline-storage"
            );
            rockIt.queueManager.setQueueMediaId(0);
            rockIt.mediaPlayerManager.play();
        } catch {
            if (request === playRequest.current)
                toasterManager.notifyError(vocabulary.ERROR);
        }
    };
    const [query, setQuery] = useState("");
    const [deleteFailed, setDeleteFailed] = useState(false);
    const failed = !!resource.error || deleteFailed;
    const load = async () => {
        setDeleteFailed(false);
        await refresh();
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
                    ListFooterComponent={
                        <View style={{ paddingVertical: theme.spacing.lg }}>
                            <OfflineRetention />
                        </View>
                    }
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
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${vocabulary.PLAY} ${item.name ?? item.publicId}`}
                                onPress={() => void playSaved(item.publicId)}
                                style={{
                                    flex: 1,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: theme.spacing.md,
                                }}
                            >
                                <OfflineCover
                                    key={`${item.publicId}:${item.coverBlob?.size ?? 0}`}
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
                                    {"\n"}
                                    {vocabulary.OFFLINE_SAVED_ON}{" "}
                                    {new Date(
                                        item.downloadedAt
                                    ).toLocaleDateString(lang)}
                                </Text>
                            </Pressable>
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
