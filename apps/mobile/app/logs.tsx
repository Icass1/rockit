import { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import {
    Bug,
    ChevronDown,
    ChevronUp,
    CircleX,
    Eraser,
    Info,
    Share2,
    TriangleAlert,
    X,
} from "@rockit/ui/icons";
import {
    FlatList,
    Pressable,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logger, type LogEntry, type LogLevel } from "@/lib/logger";
import { SHEET_DEBUG_PREFIX } from "@/lib/sheetDebug";
import { useVocabulary } from "@/lib/vocabulary";

const LEVEL_CONFIG = (
    theme: DesignTheme
): Record<
    LogLevel,
    { label: string; color: string; bg: string; icon: React.ReactNode }
> => ({
    debug: {
        label: "DEBUG",
        color: theme.colors["muted-foreground"],
        bg: withAlpha(theme.colors["muted-foreground"], 0.15),
        icon: <Bug size={12} color={theme.colors["muted-foreground"]} />,
    },
    log: {
        label: "LOG",
        color: theme.colors["info"],
        bg: withAlpha(theme.colors["info"], 0.15),
        icon: <Info size={12} color={theme.colors["info"]} />,
    },
    info: {
        label: "INFO",
        color: theme.colors["success"],
        bg: withAlpha(theme.colors["success"], 0.15),
        icon: <Info size={12} color={theme.colors["success"]} />,
    },
    warn: {
        label: "WARN",
        color: theme.colors["warning"],
        bg: withAlpha(theme.colors["warning"], 0.15),
        icon: <TriangleAlert size={12} color={theme.colors["warning"]} />,
    },
    error: {
        label: "ERROR",
        color: theme.colors["destructive"],
        bg: withAlpha(theme.colors["destructive"], 0.15),
        icon: <CircleX size={12} color={theme.colors["destructive"]} />,
    },
});

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
}

function LogRow({ item }: { item: LogEntry }) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const [expanded, setExpanded] = useState(false);
    const cfg = LEVEL_CONFIG(theme)[item.level];

    return (
        <Pressable style={styles.logRow} onPress={() => setExpanded((p) => !p)}>
            <View style={styles.logHeader}>
                <View style={[styles.levelBadge, { backgroundColor: cfg.bg }]}>
                    {cfg.icon}
                    <Text style={[styles.levelText, { color: cfg.color }]}>
                        {cfg.label}
                    </Text>
                </View>
                <Text style={styles.timestamp}>
                    {formatTimestamp(item.timestamp)}
                </Text>
                <View style={styles.expandIcon}>
                    {expanded ? (
                        <ChevronUp size={14} color={theme.legacy.gray400} />
                    ) : (
                        <ChevronDown size={14} color={theme.legacy.gray400} />
                    )}
                </View>
            </View>
            <Text
                style={styles.summary}
                numberOfLines={expanded ? undefined : 2}
            >
                {String(item.args[0] ?? "")}
            </Text>
            {expanded && item.args.length > 1 && (
                <View style={styles.argsContainer}>
                    {item.args.slice(1).map((arg, i) => (
                        <Text key={i} style={styles.argText}>
                            {formatArg(arg)}
                        </Text>
                    ))}
                </View>
            )}
        </Pressable>
    );
}

function formatArg(arg: unknown): string {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    if (arg instanceof Error)
        return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
    if (typeof arg === "object") {
        try {
            return JSON.stringify(arg, null, 2);
        } catch {
            return String(arg);
        }
    }
    return String(arg);
}

export default function LogsScreen() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const logs = useStore(logger.logsAtom);
    const [filter, setFilter] = useState<LogLevel | null>(null);
    const { top: safeTop } = useSafeAreaInsets();
    const { vocabulary } = useVocabulary();

    const shareSheetLogs = async () => {
        const message = logger
            .getLogs()
            .filter((entry) =>
                String(entry.args[0]).startsWith(SHEET_DEBUG_PREFIX)
            )
            .map(
                (entry) =>
                    `${entry.timestamp} ${entry.args.map(formatArg).join(" ")}`
            )
            .join("\n");
        try {
            await Share.share({
                message:
                    message ||
                    `${SHEET_DEBUG_PREFIX} No sheet events recorded.`,
            });
        } catch (error) {
            console.error("Failed to share sheet debug logs", error);
        }
    };

    const filtered = useMemo(() => {
        const arr = filter ? logs.filter((l) => l.level === filter) : logs;
        return [...arr].reverse();
    }, [logs, filter]);

    const levels: LogLevel[] = ["debug", "log", "info", "warn", "error"];

    const countByLevel = useMemo(() => {
        const map: Record<string, number> = {};
        for (const l of logs) {
            map[l.level] = (map[l.level] ?? 0) + 1;
        }
        return map;
    }, [logs]);

    return (
        <View style={[styles.container, { paddingTop: safeTop + 12 }]}>
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <Bug size={20} color={theme.legacy.white} />
                    <Text style={styles.headerTitle}>{vocabulary.LOGS}</Text>
                    <Text style={styles.logCount}>{logs.length}</Text>
                </View>
                <Pressable
                    style={styles.clearButton}
                    onPress={shareSheetLogs}
                    accessibilityRole="button"
                    accessibilityLabel={vocabulary.SETTINGS_SHARE_SHEET_LOGS}
                >
                    <Share2 size={16} color={theme.legacy.gray400} />
                </Pressable>
                <Pressable
                    style={styles.clearButton}
                    onPress={() => logger.clear()}
                >
                    <Eraser size={16} color={theme.legacy.gray400} />
                </Pressable>
            </View>

            <View style={styles.filterRow}>
                {levels.map((level) => {
                    const active = filter === level;
                    const cfg = LEVEL_CONFIG(theme)[level];
                    return (
                        <Pressable
                            key={level}
                            style={[
                                styles.filterChip,
                                {
                                    borderColor: active
                                        ? cfg.color
                                        : theme.legacy.gray800,
                                },
                                active && { backgroundColor: cfg.bg },
                            ]}
                            onPress={() =>
                                setFilter((p) => (p === level ? null : level))
                            }
                        >
                            {cfg.icon}
                            <Text
                                style={[
                                    styles.filterChipText,
                                    {
                                        color: active
                                            ? cfg.color
                                            : theme.legacy.gray400,
                                    },
                                ]}
                            >
                                {cfg.label}
                            </Text>
                            {countByLevel[level] > 0 && (
                                <Text
                                    style={[
                                        styles.filterChipCount,
                                        {
                                            color: active
                                                ? cfg.color
                                                : theme.legacy.gray600,
                                        },
                                    ]}
                                >
                                    {countByLevel[level]}
                                </Text>
                            )}
                        </Pressable>
                    );
                })}
                {filter && (
                    <Pressable
                        style={styles.clearFilterButton}
                        onPress={() => setFilter(null)}
                    >
                        <X size={14} color={theme.legacy.gray400} />
                    </Pressable>
                )}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <LogRow item={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Bug size={32} color={theme.legacy.gray600} />
                        <Text style={styles.emptyText}>
                            {vocabulary.MOBILE_LOGS_EMPTY}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        headerRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
        },
        headerLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        headerTitle: {
            color: theme.legacy.white,
            fontSize: 20,
            fontWeight: "700",
        },
        logCount: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.body,
            fontWeight: "600",
        },
        clearButton: {
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            backgroundColor: theme.legacy.bgCard,
        },
        filterRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
            alignItems: "center",
        },
        filterChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.legacy.gray800,
        },
        filterChipText: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.5,
        },
        filterChipCount: {
            fontSize: 10,
            fontWeight: "600",
            marginLeft: 2,
        },
        clearFilterButton: {
            padding: 6,
            borderRadius: 6,
            backgroundColor: theme.legacy.bgCard,
        },
        listContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
        },
        logRow: {
            backgroundColor: theme.legacy.bgCard,
            borderRadius: 10,
            padding: theme.spacing.md,
            marginBottom: 6,
            borderWidth: 1,
            borderColor: theme.legacy.gray800,
        },
        logHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginBottom: 6,
        },
        levelBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            paddingVertical: 2,
            paddingHorizontal: 6,
            borderRadius: theme.radius.sm,
        },
        levelText: {
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.5,
        },
        timestamp: {
            color: theme.legacy.gray600,
            fontSize: 11,
            fontFamily: "monospace",
            flex: 1,
        },
        expandIcon: {
            marginLeft: "auto",
        },
        summary: {
            color: theme.legacy.white,
            fontSize: 13,
            fontFamily: "monospace",
            lineHeight: 18,
        },
        argsContainer: {
            marginTop: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.legacy.gray800,
            gap: theme.spacing.xs,
        },
        argText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.caption,
            fontFamily: "monospace",
            lineHeight: 16,
        },
        emptyContainer: {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 80,
            gap: theme.spacing.md,
        },
        emptyText: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.label,
        },
    });
