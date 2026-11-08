import { useCallback, useState } from "react";
import {
    BottomSheetFlatList,
    BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useStore } from "@nanostores/react";
import type { BookmarkResponse } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import {
    Bookmark,
    BookmarkCheck,
    ChevronDown,
    LucideProps,
    Pencil,
    Plus,
    Repeat1,
    SkipBack,
    Trash2,
    X,
} from "@rockit/ui/icons";
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/lib/vocabulary";

const MODE_OPTIONS = (
    theme: DesignTheme
): {
    key: "NOTHING" | "AUTOSKIP" | "REPEAT_FROM_BEGINNING" | "PREVIOUS_BOOKMARK";
    Icon: React.ForwardRefExoticComponent<
        LucideProps & React.RefAttributes<SVGSVGElement>
    >;
    color: string;
}[] => [
    {
        key: "NOTHING",
        Icon: Bookmark,
        color: theme.colors["foreground-strong"],
    },
    {
        key: "AUTOSKIP",
        Icon: BookmarkCheck,
        color: theme.colors["bookmark-autoskip"],
    },
    {
        key: "REPEAT_FROM_BEGINNING",
        Icon: Repeat1,
        color: theme.colors["bookmark-repeat"],
    },
    {
        key: "PREVIOUS_BOOKMARK",
        Icon: SkipBack,
        color: theme.colors["bookmark-previous"],
    },
];

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTimestamp(text: string): number {
    const parts = text.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(text) || 0;
}

interface BookmarkPopupProps {
    onClose: () => void;
    standalone?: boolean;
}

export default function BookmarkPopup({
    onClose,
    standalone = false,
}: BookmarkPopupProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const BookmarkList = standalone ? FlatList : BottomSheetFlatList;
    const BookmarkInput = standalone ? TextInput : BottomSheetTextInput;
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );

    const { vocabulary } = useVocabulary();

    const insets = useSafeAreaInsets();
    const { currentMedia } = usePlayer();
    const { currentTime } = usePlayerTime();
    const mediaPublicId = currentMedia?.publicId;

    const [mode, setMode] = useState<"list" | "edit">("list");
    const [editBookmark, setEditBookmark] = useState<BookmarkResponse | null>(
        null
    );
    const [editTimestamp, setEditTimestamp] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editMode, setEditMode] = useState("NOTHING");
    const [showModeDropdown, setShowModeDropdown] = useState(false);

    const startEdit = useCallback(
        (bookmark: BookmarkResponse | null) => {
            setEditBookmark(bookmark);
            setEditTimestamp(formatTime(bookmark?.timestamp ?? currentTime));
            setEditDescription(bookmark?.description ?? "");
            setEditMode(bookmark?.mode ?? "NOTHING");
            setShowModeDropdown(false);
            setMode("edit");
        },
        [currentTime]
    );

    const handleSave = useCallback(async () => {
        const ts = parseTimestamp(editTimestamp);
        if (editBookmark) {
            await rockIt.bookmarkManager.updateBookmarkAsync(
                editBookmark.publicId,
                ts,
                editDescription || null,
                editMode
            );
        } else if (mediaPublicId) {
            await rockIt.bookmarkManager.createBookmarkAsync(
                mediaPublicId,
                ts,
                editDescription || null,
                editMode
            );
        }
        setMode("list");
    }, [editBookmark, editTimestamp, editDescription, editMode, mediaPublicId]);

    const handleDelete = useCallback(async () => {
        if (editBookmark) {
            await rockIt.bookmarkManager.deleteBookmarkAsync(
                editBookmark.publicId
            );
        }
        setMode("list");
    }, [editBookmark]);

    const sortedBookmarks = [...$bookmarks].sort(
        (a, b) => a.timestamp - b.timestamp
    );

    const ModeIcon =
        MODE_OPTIONS(theme).find((o) => o.key === editMode)?.Icon ?? Bookmark;
    const modeColor =
        MODE_OPTIONS(theme).find((o) => o.key === editMode)?.color ??
        theme.colors["foreground-strong"];

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
            {mode === "edit" ? (
                <ScrollView
                    style={styles.editContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.editHeader}>
                        <TouchableOpacity
                            onPress={() => setMode("list")}
                            style={styles.backButton}
                        >
                            <View
                                style={{
                                    transform: [{ rotate: "90deg" }],
                                }}
                            >
                                <ChevronDown
                                    size={18}
                                    color={theme.legacy.gray400}
                                />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.editTitle}>
                            {editBookmark
                                ? vocabulary.EDIT_BOOKMARK
                                : vocabulary.NEW_BOOKMARK}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                            {editBookmark && (
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={styles.deleteButton}
                                >
                                    <Trash2
                                        size={16}
                                        color={theme.colors["destructive"]}
                                    />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleSave}
                                style={styles.saveButton}
                            >
                                <Text style={styles.saveText}>
                                    {vocabulary.SAVE}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.editRow}>
                        <BookmarkInput
                            value={editTimestamp}
                            onChangeText={setEditTimestamp}
                            style={styles.timestampInput}
                            placeholderTextColor={theme.legacy.gray600}
                            placeholder="0:00"
                        />
                        <View style={styles.modeWrapper}>
                            <TouchableOpacity
                                onPress={() =>
                                    setShowModeDropdown(!showModeDropdown)
                                }
                                style={styles.modeButton}
                            >
                                <View
                                    style={[
                                        styles.modeDot,
                                        {
                                            backgroundColor: modeColor,
                                        },
                                    ]}
                                />
                                <ModeIcon
                                    size={16}
                                    color={theme.legacy.gray400}
                                />
                                <ChevronDown
                                    size={12}
                                    color={theme.legacy.gray400}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <BookmarkInput
                        value={editDescription}
                        onChangeText={setEditDescription}
                        style={styles.descriptionInput}
                        placeholderTextColor={theme.legacy.gray600}
                        placeholder={
                            vocabulary.BOOKMARK_DESCRIPTION_PLACEHOLDER
                        }
                    />

                    {showModeDropdown && (
                        <View style={styles.dropdown}>
                            {MODE_OPTIONS(theme).map((opt) => {
                                const Icon = opt.Icon;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        onPress={() => {
                                            setEditMode(opt.key);
                                            setShowModeDropdown(false);
                                        }}
                                        style={[
                                            styles.dropdownItem,
                                            opt.key === editMode &&
                                                styles.dropdownItemActive,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.modeDot,
                                                {
                                                    backgroundColor: opt.color,
                                                },
                                            ]}
                                        />
                                        <Icon
                                            size={16}
                                            color={theme.legacy.gray400}
                                        />
                                        <Text style={styles.dropdownLabel}>
                                            {vocabulary[opt.key]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            ) : (
                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>
                            {vocabulary.BOOKMARKS}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={18} color={theme.legacy.gray400} />
                        </TouchableOpacity>
                    </View>

                    {sortedBookmarks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                {vocabulary.NO_BOOKMARKS}
                            </Text>
                        </View>
                    ) : (
                        <BookmarkList
                            data={sortedBookmarks}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            keyExtractor={(item: BookmarkResponse) =>
                                item.publicId
                            }
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            renderItem={({
                                item,
                            }: {
                                item: BookmarkResponse;
                            }) => {
                                const bmColor =
                                    MODE_OPTIONS(theme).find(
                                        (o) => o.key === item.mode
                                    )?.color ??
                                    theme.colors["foreground-strong"];
                                return (
                                    <View style={styles.bookmarkItem}>
                                        <View
                                            style={[
                                                styles.modeDot,
                                                {
                                                    backgroundColor: bmColor,
                                                },
                                            ]}
                                        />
                                        <TouchableOpacity
                                            style={styles.bookmarkInfo}
                                            onPress={() => {
                                                // Seek the current media to the bookmark timestamp
                                                rockIt.mediaPlayerManager.setCurrentTime(
                                                    item.timestamp,
                                                    true
                                                );
                                                onClose();
                                            }}
                                        >
                                            <Text style={styles.bookmarkTime}>
                                                {formatTime(item.timestamp)}
                                            </Text>
                                            {item.description && (
                                                <Text
                                                    style={styles.bookmarkDesc}
                                                    numberOfLines={1}
                                                >
                                                    {item.description}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => startEdit(item)}
                                            style={styles.editIconButton}
                                        >
                                            <Pencil
                                                size={14}
                                                color={theme.legacy.gray400}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                await rockIt.bookmarkManager.deleteBookmarkAsync(
                                                    item.publicId
                                                );
                                            }}
                                            style={styles.editIconButton}
                                        >
                                            <Trash2
                                                size={14}
                                                color={theme.legacy.gray400}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            }}
                        />
                    )}

                    <TouchableOpacity
                        onPress={() => startEdit(null)}
                        style={styles.addButton}
                    >
                        <Plus size={16} color={theme.legacy.gray400} />
                        <Text style={styles.addButtonText}>
                            {vocabulary.ADD_BOOKMARK_AT}
                            {formatTime(currentTime)}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingTop: theme.spacing.sm,
        },
        // List mode
        listContainer: {
            flex: 1,
            paddingHorizontal: 20,
        },
        listHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: theme.spacing.md,
        },
        listTitle: {
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            color: theme.legacy.white,
        },
        list: {
            flex: 1,
        },
        listContent: {
            paddingBottom: theme.spacing.sm,
        },
        emptyState: {
            alignItems: "center",
            paddingVertical: theme.spacing.xxl,
        },
        emptyText: {
            fontSize: theme.typography.body,
            color: theme.legacy.gray400,
        },
        bookmarkItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: theme.radius.md,
        },
        bookmarkInfo: {
            flex: 1,
            minWidth: 0,
        },
        bookmarkTime: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.white,
        },
        bookmarkDesc: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray400,
            marginTop: 1,
        },
        editIconButton: {
            padding: 6,
        },
        addButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: theme.legacy.gray600,
            borderRadius: theme.radius.md,
            paddingVertical: 10,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
        },
        addButtonText: {
            fontSize: 13,
            color: theme.legacy.gray400,
        },
        // Edit mode
        editContainer: {
            paddingHorizontal: 20,
            paddingTop: theme.spacing.xs,
        },
        editHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.md,
        },
        backButton: {
            padding: theme.spacing.xs,
        },
        editTitle: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.gray400,
        },
        deleteButton: {
            padding: 6,
        },
        saveButton: {
            backgroundColor: theme.legacy.accent,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 6,
            borderRadius: 6,
        },
        saveText: {
            fontSize: theme.typography.caption,
            fontWeight: "600",
            color: theme.legacy.white,
        },
        editRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
        },
        timestampInput: {
            width: 60,
            borderWidth: 1,
            borderColor: theme.legacy.gray600,
            borderRadius: 6,
            backgroundColor: theme.legacy.bgCardLight,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 6,
            fontSize: 13,
            color: theme.legacy.white,
            textAlign: "center",
        },
        modeWrapper: {
            position: "relative",
        },
        modeButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
        },
        modeDot: {
            width: 8,
            height: 8,
            borderRadius: theme.radius.sm,
        },
        descriptionInput: {
            borderWidth: 1,
            borderColor: theme.legacy.gray600,
            borderRadius: 6,
            backgroundColor: theme.legacy.bgCardLight,
            paddingHorizontal: 10,
            paddingVertical: theme.spacing.sm,
            fontSize: 13,
            color: theme.legacy.white,
            marginBottom: theme.spacing.sm,
        },
        dropdown: {
            backgroundColor: theme.legacy.bgCard,
            borderWidth: 1,
            borderColor: theme.legacy.gray600,
            borderRadius: theme.radius.md,
            padding: theme.spacing.xs,
            marginBottom: theme.spacing.md,
        },
        dropdownItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: 10,
            borderRadius: 6,
        },
        dropdownItemActive: {
            backgroundColor: withAlpha(theme.colors["primary"], 0.15),
        },
        dropdownLabel: {
            fontSize: 13,
            color: theme.legacy.white,
        },
    });
