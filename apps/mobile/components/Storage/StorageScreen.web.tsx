import { useCallback, useEffect, useRef, useState } from "react";
import {
    listOfflineSongRecords,
    offlineLibraryRevision,
} from "@rockit/platform-browser/offline/db";
import { removeOfflineSong } from "@rockit/platform-browser/offline/store";
import {
    ActionButton,
    IconButton,
    MediaArtwork,
    useDesignTheme,
} from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { ArrowLeft, ChevronRight, HardDrive, Trash2 } from "@rockit/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import type {
    OfflineStorageEntry,
    OfflineStorageMode,
} from "@/models/interfaces/offlineStorage";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    groupOfflineSongs,
    matchesOfflineSong,
} from "@/lib/storage/offlineGroups.web";
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
    const [mode, setMode] = useState<OfflineStorageMode>("albums");
    const [selectedKey, setSelectedKey] = useState<string>();
    const [deleteFailed, setDeleteFailed] = useState(false);
    const failed = !!resource.error || deleteFailed;
    const load = async () => {
        setDeleteFailed(false);
        await refresh();
    };
    const songs = resource.data ?? [];
    const groups = groupOfflineSongs(songs, mode, vocabulary, lang);
    const selectedGroup =
        mode !== "songs"
            ? groups.find((group) => group.key === selectedKey)
            : undefined;
    const visibleSongs = selectedGroup?.songs ?? songs;
    const filtered = visibleSongs.filter((song) =>
        matchesOfflineSong(song, query, lang)
    );
    if (!selectedGroup)
        filtered.sort((a, b) =>
            (a.name ?? a.media?.name ?? a.publicId).localeCompare(
                b.name ?? b.media?.name ?? b.publicId,
                lang
            )
        );
    const visibleGroups = groups.filter(
        (group) =>
            group.title
                .toLocaleLowerCase(lang)
                .includes(query.trim().toLocaleLowerCase(lang)) ||
            group.songs.some((song) => matchesOfflineSong(song, query, lang))
    );
    const entries: OfflineStorageEntry[] =
        mode === "songs" || selectedGroup
            ? filtered.map((song) => ({ kind: "song", song }))
            : visibleGroups.map((group) => ({ kind: "group", group }));
    const sizeMb =
        visibleSongs.reduce((sum, song) => sum + song.sizeBytes, 0) /
        1024 /
        1024;
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
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                }}
            >
                <IconButton
                    label={
                        selectedGroup
                            ? vocabulary.MOBILE_STORAGE_DOWNLOADS
                            : vocabulary.RETURN_BACK_HOME
                    }
                    onPress={() => {
                        invalidatePlayback();
                        if (selectedGroup) {
                            setSelectedKey(undefined);
                            setQuery("");
                        } else router.back();
                    }}
                >
                    <ArrowLeft color={theme.colors.foreground} />
                </IconButton>
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <Text
                        numberOfLines={2}
                        style={{
                            color: theme.colors.foreground,
                            fontSize: theme.typography.subtitle,
                            fontWeight: "700",
                        }}
                    >
                        {selectedGroup?.title ??
                            vocabulary.MOBILE_STORAGE_DOWNLOADS}
                    </Text>
                    <Text
                        style={{
                            color: theme.colors["muted-foreground"],
                            fontSize: theme.typography.caption,
                        }}
                    >
                        {visibleSongs.length.toLocaleString(lang)}{" "}
                        {visibleSongs.length === 1
                            ? vocabulary.SONG
                            : vocabulary.SONGS}{" "}
                        ·{" "}
                        {sizeMb.toLocaleString(lang, {
                            maximumFractionDigits: 1,
                        })}{" "}
                        MB
                    </Text>
                </View>
                <HardDrive size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                {(
                    [
                        ["albums", vocabulary.ALBUMS],
                        ["playlists", vocabulary.PLAYLISTS],
                        ["songs", vocabulary.SONGS],
                    ] as const
                ).map(([value, label]) => (
                    <View key={value} style={{ flex: 1 }}>
                        <ActionButton
                            label={label}
                            selected={mode === value}
                            onPress={() => {
                                invalidatePlayback();
                                setMode(value);
                                setSelectedKey(undefined);
                                setQuery("");
                            }}
                        />
                    </View>
                ))}
            </View>
            <TextInput
                accessibilityLabel={vocabulary.SEARCH}
                placeholder={vocabulary.SEARCH}
                placeholderTextColor={theme.colors["muted-foreground"]}
                value={query}
                onChangeText={(value) => {
                    invalidatePlayback();
                    setQuery(value);
                }}
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
                    data={entries}
                    keyExtractor={(entry) =>
                        entry.kind === "group"
                            ? `group:${entry.group.key}`
                            : `song:${entry.song.publicId}`
                    }
                    ListEmptyComponent={
                        <Text
                            style={{ color: theme.colors["muted-foreground"] }}
                        >
                            {query
                                ? vocabulary.MOBILE_STORAGE_NO_MATCHES
                                : resource.loading
                                  ? vocabulary.MOBILE_LOADING
                                  : songs.length
                                    ? vocabulary.OFFLINE_STORAGE_GROUP_EMPTY
                                    : vocabulary.NO_OFFLINE_MEDIA}
                        </Text>
                    }
                    renderItem={({ item: entry }) => {
                        if (entry.kind === "group") {
                            const group = entry.group;
                            const first = group.songs[0];
                            const bytes =
                                group.songs.reduce(
                                    (sum, song) => sum + song.sizeBytes,
                                    0
                                ) /
                                1024 /
                                1024;
                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={group.title}
                                    onPress={() => {
                                        invalidatePlayback();
                                        setSelectedKey(group.key);
                                        setQuery("");
                                    }}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: theme.spacing.md,
                                        padding: theme.spacing.md,
                                        marginBottom: theme.spacing.sm,
                                        borderRadius: theme.radius.lg,
                                        backgroundColor: theme.colors.surface,
                                    }}
                                >
                                    <OfflineCover
                                        key={`${first.publicId}:${first.coverBlob?.size ?? 0}`}
                                        publicId={first.publicId}
                                        name={group.title}
                                    />
                                    <View
                                        style={{
                                            flex: 1,
                                            gap: theme.spacing.xs,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: theme.colors.foreground,
                                                fontWeight: "600",
                                            }}
                                            numberOfLines={2}
                                        >
                                            {group.title}
                                        </Text>
                                        <Text
                                            style={{
                                                color: theme.colors[
                                                    "muted-foreground"
                                                ],
                                                fontSize:
                                                    theme.typography.caption,
                                            }}
                                        >
                                            {group.songs.length.toLocaleString(
                                                lang
                                            )}{" "}
                                            {group.songs.length === 1
                                                ? vocabulary.SONG
                                                : vocabulary.SONGS}{" "}
                                            ·{" "}
                                            {bytes.toLocaleString(lang, {
                                                maximumFractionDigits: 1,
                                            })}{" "}
                                            MB
                                        </Text>
                                    </View>
                                    <ChevronRight
                                        size={20}
                                        color={theme.colors["muted-foreground"]}
                                    />
                                </Pressable>
                            );
                        }
                        const item = entry.song;
                        return (
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
                                    onPress={() =>
                                        void playSaved(item.publicId)
                                    }
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
                        );
                    }}
                />
            )}
        </View>
    );
}
