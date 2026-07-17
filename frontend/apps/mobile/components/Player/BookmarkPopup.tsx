import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import type { BookmarkResponse } from "@rockit/shared";
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
} from "lucide-react-native";
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/lib/vocabulary";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MODE_OPTIONS: {
    key: "NOTHING" | "AUTOSKIP" | "REPEAT_FROM_BEGINNING" | "PREVIOUS_BOOKMARK";
    Icon: React.ForwardRefExoticComponent<
        LucideProps & React.RefAttributes<SVGSVGElement>
    >;
    color: string;
}[] = [
    { key: "NOTHING", Icon: Bookmark, color: "#ffffff" },
    {
        key: "AUTOSKIP",
        Icon: BookmarkCheck,
        color: "#00ff00",
    },
    {
        key: "REPEAT_FROM_BEGINNING",
        Icon: Repeat1,
        color: "#00ffff",
    },
    {
        key: "PREVIOUS_BOOKMARK",
        Icon: SkipBack,
        color: "#ff8000",
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
    visible: boolean;
    currentTime: number;
    mediaPublicId: string | undefined;
    onClose: () => void;
}

export default function BookmarkPopup({
    visible,
    currentTime,
    mediaPublicId,
    onClose,
}: BookmarkPopupProps) {
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );

    const { vocabulary } = useVocabulary();

    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const [mode, setMode] = useState<"list" | "edit">("list");
    const [editBookmark, setEditBookmark] = useState<BookmarkResponse | null>(
        null
    );
    const [editTimestamp, setEditTimestamp] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editMode, setEditMode] = useState("NOTHING");
    const [showModeDropdown, setShowModeDropdown] = useState(false);

    useEffect(() => {
        if (visible) {
            setMode("list");
            setEditBookmark(null);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 50,
                stiffness: 300,
                mass: 0.8,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, translateY]);

    const handleClose = useCallback(() => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
        }).start(() => onClose());
    }, [translateY, onClose]);

    const startEdit = useCallback(
        (bookmark: BookmarkResponse | null) => {
            setEditBookmark(bookmark);
            setEditTimestamp(formatTime(bookmark?.timestamp ?? currentTime));
            setEditDescription(bookmark?.description ?? "");
            setEditMode(bookmark?.mode ?? "NOTHING");
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
        MODE_OPTIONS.find((o) => o.key === editMode)?.Icon ?? Bookmark;
    const modeColor =
        MODE_OPTIONS.find((o) => o.key === editMode)?.color ?? "#ffffff";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: insets.bottom + 16,
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{ flex: 1 }}
                    >
                        <View style={styles.handleBar} />

                        {mode === "edit" ? (
                            <View style={styles.editContainer}>
                                <View style={styles.editHeader}>
                                    <TouchableOpacity
                                        onPress={() => setMode("list")}
                                        style={styles.backButton}
                                    >
                                        <ChevronDown
                                            size={18}
                                            color={COLORS.gray400}
                                            style={{
                                                transform: [
                                                    { rotate: "90deg" },
                                                ],
                                            }}
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.editTitle}>
                                        {editBookmark
                                            ? "Edit Bookmark"
                                            : "New Bookmark"}
                                    </Text>
                                    <View
                                        style={{ flexDirection: "row", gap: 4 }}
                                    >
                                        {editBookmark && (
                                            <TouchableOpacity
                                                onPress={handleDelete}
                                                style={styles.deleteButton}
                                            >
                                                <Trash2
                                                    size={16}
                                                    color="#ef4444"
                                                />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={handleSave}
                                            style={styles.saveButton}
                                        >
                                            <Text style={styles.saveText}>
                                                Save
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.editRow}>
                                    <TextInput
                                        value={editTimestamp}
                                        onChangeText={setEditTimestamp}
                                        style={styles.timestampInput}
                                        placeholderTextColor={COLORS.gray600}
                                        placeholder="0:00"
                                    />
                                    <View style={styles.modeWrapper}>
                                        <TouchableOpacity
                                            onPress={() =>
                                                setShowModeDropdown(
                                                    !showModeDropdown
                                                )
                                            }
                                            style={styles.modeButton}
                                        >
                                            <View
                                                style={[
                                                    styles.modeDot,
                                                    {
                                                        backgroundColor:
                                                            modeColor,
                                                    },
                                                ]}
                                            />
                                            <ModeIcon
                                                size={16}
                                                color={COLORS.gray400}
                                            />
                                            <ChevronDown
                                                size={12}
                                                color={COLORS.gray400}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TextInput
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    style={styles.descriptionInput}
                                    placeholderTextColor={COLORS.gray600}
                                    placeholder="Description (optional)"
                                />

                                {showModeDropdown && (
                                    <View style={styles.dropdown}>
                                        {MODE_OPTIONS.map((opt) => {
                                            const Icon = opt.Icon;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.key}
                                                    onPress={() => {
                                                        setEditMode(opt.key);
                                                        setShowModeDropdown(
                                                            false
                                                        );
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
                                                                backgroundColor:
                                                                    opt.color,
                                                            },
                                                        ]}
                                                    />
                                                    <Icon
                                                        size={16}
                                                        color={COLORS.gray400}
                                                    />
                                                    <Text
                                                        style={
                                                            styles.dropdownLabel
                                                        }
                                                    >
                                                        {vocabulary[opt.key]}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.listContainer}>
                                <View style={styles.listHeader}>
                                    <Text style={styles.listTitle}>
                                        Bookmarks
                                    </Text>
                                    <TouchableOpacity onPress={handleClose}>
                                        <X size={18} color={COLORS.gray400} />
                                    </TouchableOpacity>
                                </View>

                                {sortedBookmarks.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>
                                            No bookmarks
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={sortedBookmarks}
                                        keyExtractor={(item) => item.publicId}
                                        style={styles.list}
                                        contentContainerStyle={
                                            styles.listContent
                                        }
                                        renderItem={({ item }) => {
                                            const bmColor =
                                                MODE_OPTIONS.find(
                                                    (o) => o.key === item.mode
                                                )?.color ?? "#ffffff";
                                            return (
                                                <View
                                                    style={styles.bookmarkItem}
                                                >
                                                    <View
                                                        style={[
                                                            styles.modeDot,
                                                            {
                                                                backgroundColor:
                                                                    bmColor,
                                                            },
                                                        ]}
                                                    />
                                                    <TouchableOpacity
                                                        style={
                                                            styles.bookmarkInfo
                                                        }
                                                        onPress={() => {
                                                            // Seek the current media to the bookmark timestamp
                                                            rockIt.mediaPlayerManager.setCurrentTime(
                                                                item.timestamp,
                                                                true
                                                            );
                                                            handleClose();
                                                        }}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.bookmarkTime
                                                            }
                                                        >
                                                            {formatTime(
                                                                item.timestamp
                                                            )}
                                                        </Text>
                                                        {item.description && (
                                                            <Text
                                                                style={
                                                                    styles.bookmarkDesc
                                                                }
                                                                numberOfLines={
                                                                    1
                                                                }
                                                            >
                                                                {
                                                                    item.description
                                                                }
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() =>
                                                            startEdit(item)
                                                        }
                                                        style={
                                                            styles.editIconButton
                                                        }
                                                    >
                                                        <Pencil
                                                            size={14}
                                                            color={
                                                                COLORS.gray400
                                                            }
                                                        />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={async () => {
                                                            await rockIt.bookmarkManager.deleteBookmarkAsync(
                                                                item.publicId
                                                            );
                                                        }}
                                                        style={
                                                            styles.editIconButton
                                                        }
                                                    >
                                                        <Trash2
                                                            size={14}
                                                            color={
                                                                COLORS.gray400
                                                            }
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
                                    <Plus size={16} color={COLORS.gray400} />
                                    <Text style={styles.addButtonText}>
                                        Add bookmark at{" "}
                                        {formatTime(currentTime)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#1a1a1a",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.7,
        minHeight: 300,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 8,
    },
    // List mode
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.white,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 8,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.gray400,
    },
    bookmarkItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    bookmarkInfo: {
        flex: 1,
        minWidth: 0,
    },
    bookmarkTime: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    bookmarkDesc: {
        fontSize: 12,
        color: COLORS.gray400,
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
        borderColor: COLORS.gray600,
        borderRadius: 8,
        paddingVertical: 10,
        marginTop: 8,
        marginBottom: 16,
    },
    addButtonText: {
        fontSize: 13,
        color: COLORS.gray400,
    },
    // Edit mode
    editContainer: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    editHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    backButton: {
        padding: 4,
    },
    editTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.gray400,
    },
    deleteButton: {
        padding: 6,
    },
    saveButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    saveText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.white,
    },
    editRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    timestampInput: {
        width: 60,
        borderWidth: 1,
        borderColor: COLORS.gray600,
        borderRadius: 6,
        backgroundColor: COLORS.bgCardLight,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 13,
        color: COLORS.white,
        textAlign: "center",
    },
    modeWrapper: {
        position: "relative",
    },
    modeButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    modeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    descriptionInput: {
        borderWidth: 1,
        borderColor: COLORS.gray600,
        borderRadius: 6,
        backgroundColor: COLORS.bgCardLight,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: COLORS.white,
        marginBottom: 8,
    },
    dropdown: {
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: COLORS.gray600,
        borderRadius: 8,
        padding: 4,
        marginBottom: 12,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    dropdownItemActive: {
        backgroundColor: "rgba(238,16,134,0.15)",
    },
    dropdownLabel: {
        fontSize: 13,
        color: COLORS.white,
    },
});
