import { useCallback, useEffect, useMemo, useState } from "react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import {
    ArrowLeft,
    ChevronRight,
    FileCode,
    File as FileIcon,
    FileImage,
    FileMusic,
    FileVideo,
    Folder,
    HardDrive,
    Search,
    X,
} from "@rockit/ui/icons";
import { Directory, File, Paths } from "expo-file-system";
import {
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVocabulary } from "@/lib/vocabulary";

type Entry =
    | { kind: "dir"; name: string; uri: string; size: number | null }
    | { kind: "file"; name: string; uri: string; size: number };

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileIcon(name: string, theme: DesignTheme): React.ReactNode {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "json")
        return <FileCode size={18} color={theme.colors["warning"]} />;
    if (["mp3", "m4a", "aac", "ogg", "wav", "flac"].includes(ext ?? ""))
        return <FileMusic size={18} color={theme.colors["info"]} />;
    if (["mp4", "webm", "mkv", "m3u8", "mpd"].includes(ext ?? ""))
        return <FileVideo size={18} color={theme.colors["highlight"]} />;
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext ?? ""))
        return <FileImage size={18} color={theme.colors["success"]} />;
    return <FileIcon size={18} color={theme.colors["muted-foreground"]} />;
}

function DirSize({ size }: { size: number | null }) {
    const styles = useThemedStyles(createStyles);
    if (size === null) return null;
    return <Text style={styles.metaText}>{formatBytes(size)}</Text>;
}

interface JsonViewerProps {
    content: string;
    filename: string;
    onClose: () => void;
}

function JsonViewer({ content, filename, onClose }: JsonViewerProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const formatted = useMemo(() => {
        try {
            return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
            return content;
        }
    }, [content]);

    return (
        <Modal
            visible
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.jsonOverlay}>
                <View style={styles.jsonHeader}>
                    <Pressable onPress={onClose} style={styles.jsonBack}>
                        <ArrowLeft size={22} color={theme.legacy.white} />
                    </Pressable>
                    <Text style={styles.jsonTitle} numberOfLines={1}>
                        {filename}
                    </Text>
                    <View style={styles.jsonBack} />
                </View>
                <ScrollView
                    style={styles.jsonScroll}
                    contentContainerStyle={styles.jsonContent}
                    horizontal={false}
                    showsVerticalScrollIndicator
                >
                    <Text style={styles.jsonText} selectable>
                        {formatted}
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
}

export default function StorageScreen() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
    const [history, setHistory] = useState<string[]>([Paths.document.uri]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [jsonView, setJsonView] = useState<{
        content: string;
        filename: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const currentDir = history[history.length - 1];
    const dirName =
        currentDir === Paths.document.uri
            ? "Documents"
            : (currentDir.split("/").pop() ?? currentDir);

    const loadDir = useCallback(async (dirUri: string) => {
        setLoading(true);
        try {
            const dir = new Directory(dirUri);
            const items = dir.list();
            const result: Entry[] = await Promise.all(
                items.map(async (item) => {
                    if (item instanceof Directory) {
                        let size: number | null = null;
                        try {
                            size = item.size;
                        } catch {}
                        return {
                            kind: "dir" as const,
                            name: item.name,
                            uri: item.uri,
                            size,
                        };
                    }
                    return {
                        kind: "file" as const,
                        name: item.name,
                        uri: item.uri,
                        size: item.size,
                    };
                })
            );
            result.sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            setEntries(result);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDir(Paths.document.uri);
    }, [loadDir]);

    const navigateDir = useCallback(
        (uri: string) => {
            setHistory((prev) => [...prev, uri]);
            loadDir(uri);
            setSearchQuery("");
        },
        [loadDir]
    );

    const goBack = useCallback(() => {
        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            setHistory(newHistory);
            loadDir(newHistory[newHistory.length - 1]);
        }
    }, [history, loadDir]);

    const openFile = useCallback(async (uri: string, name: string) => {
        const ext = name.split(".").pop()?.toLowerCase();
        if (ext === "json") {
            try {
                const file = new File(uri);
                const content = await file.text();
                setJsonView({ content, filename: name });
            } catch (e) {
                setJsonView({
                    content: `Error reading file:\n${String(e)}`,
                    filename: name,
                });
            }
        }
    }, []);

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return entries;
        const q = searchQuery.toLowerCase();
        return entries.filter((e) => e.name.toLowerCase().includes(q));
    }, [entries, searchQuery]);

    return (
        <View style={[styles.container, { paddingTop: safeTop }]}>
            <View style={styles.header}>
                <Pressable
                    onPress={goBack}
                    style={({ pressed }) => [
                        styles.headerBtn,
                        pressed && { opacity: 0.6 },
                        history.length <= 1 && { opacity: 0.3 },
                    ]}
                    disabled={history.length <= 1}
                >
                    <ArrowLeft size={22} color={theme.legacy.white} />
                </Pressable>
                <View style={styles.headerCenter}>
                    <HardDrive size={16} color={theme.legacy.gray400} />
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {dirName}
                    </Text>
                </View>
                <View style={styles.headerBtn} />
            </View>

            <View style={styles.searchRow}>
                <Search size={14} color={theme.legacy.gray600} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={vocabulary.SEARCH}
                    placeholderTextColor={theme.legacy.gray600}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")}>
                        <X size={14} color={theme.legacy.gray600} />
                    </Pressable>
                )}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.uri}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [
                            styles.entry,
                            pressed && styles.entryPressed,
                        ]}
                        onPress={() => {
                            if (item.kind === "dir") {
                                navigateDir(item.uri);
                            } else {
                                openFile(item.uri, item.name);
                            }
                        }}
                    >
                        <View style={styles.entryIcon}>
                            {item.kind === "dir" ? (
                                <Folder
                                    size={18}
                                    color={theme.colors["info"]}
                                />
                            ) : (
                                getFileIcon(item.name, theme)
                            )}
                        </View>
                        <View style={styles.entryInfo}>
                            <Text style={styles.entryName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={styles.entryMeta}>
                                {item.kind === "dir" ? (
                                    <DirSize size={item.size} />
                                ) : (
                                    <Text style={styles.metaText}>
                                        {formatBytes(item.size)}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <ChevronRight size={16} color={theme.legacy.gray600} />
                    </Pressable>
                )}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: safeBottom + 24 },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <HardDrive size={32} color={theme.legacy.gray600} />
                        <Text style={styles.emptyText}>
                            {loading
                                ? "Loading..."
                                : searchQuery
                                  ? vocabulary.MOBILE_STORAGE_NO_MATCHES
                                  : vocabulary.MOBILE_STORAGE_EMPTY_DIRECTORY}
                        </Text>
                    </View>
                }
                refreshing={loading}
                onRefresh={() => loadDir(currentDir)}
            />

            {jsonView && (
                <JsonViewer
                    content={jsonView.content}
                    filename={jsonView.filename}
                    onClose={() => setJsonView(null)}
                />
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.sm,
        },
        headerBtn: {
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
        },
        headerCenter: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            justifyContent: "center",
        },
        headerTitle: {
            color: theme.legacy.white,
            fontSize: 17,
            fontWeight: "700",
        },
        searchRow: {
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
            paddingHorizontal: 10,
            paddingVertical: theme.spacing.sm,
            borderRadius: 10,
            backgroundColor: theme.legacy.bgCard,
            borderWidth: 1,
            borderColor: theme.legacy.gray800,
            gap: 6,
        },
        searchInput: {
            flex: 1,
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            padding: 0,
        },
        listContent: {
            paddingHorizontal: theme.spacing.lg,
        },
        entry: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: theme.spacing.md,
            borderRadius: 10,
            gap: 10,
        },
        entryPressed: {
            backgroundColor: theme.legacy.bgCard,
        },
        entryIcon: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
        },
        entryInfo: {
            flex: 1,
        },
        entryName: {
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            fontWeight: "600",
        },
        entryMeta: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginTop: 2,
        },
        metaText: {
            color: theme.legacy.gray600,
            fontSize: 11,
            fontFamily: "monospace",
        },
        empty: {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 80,
            gap: theme.spacing.md,
        },
        emptyText: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.label,
        },
        jsonOverlay: {
            flex: 1,
            backgroundColor: theme.colors["background"],
        },
        jsonHeader: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.md,
            paddingTop: 60,
            paddingBottom: theme.spacing.md,
            gap: theme.spacing.sm,
            backgroundColor: theme.colors["secondary"],
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.legacy.gray800,
        },
        jsonBack: {
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
        },
        jsonTitle: {
            flex: 1,
            color: theme.legacy.white,
            fontSize: theme.typography.label,
            fontWeight: "700",
            textAlign: "center",
        },
        jsonScroll: {
            flex: 1,
        },
        jsonContent: {
            padding: theme.spacing.lg,
            paddingBottom: 48,
        },
        jsonText: {
            color: theme.colors["foreground"],
            fontSize: theme.typography.caption,
            fontFamily: "monospace",
            lineHeight: 18,
        },
    });
