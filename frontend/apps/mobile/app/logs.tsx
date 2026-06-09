import { useMemo, useState } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { logger, type LogLevel, type LogEntry } from "@/lib/logger";
import {
    Bug,
    ChevronDown,
    ChevronUp,
    CircleX,
    Eraser,
    Info,
    TriangleAlert,
    X,
} from "lucide-react-native";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LEVEL_CONFIG: Record<
    LogLevel,
    { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
    debug: {
        label: "DEBUG",
        color: "#a3a3a3",
        bg: "rgba(163, 163, 163, 0.15)",
        icon: <Bug size={12} color="#a3a3a3" />,
    },
    log: {
        label: "LOG",
        color: "#60a5fa",
        bg: "rgba(96, 165, 250, 0.15)",
        icon: <Info size={12} color="#60a5fa" />,
    },
    info: {
        label: "INFO",
        color: "#34d399",
        bg: "rgba(52, 211, 153, 0.15)",
        icon: <Info size={12} color="#34d399" />,
    },
    warn: {
        label: "WARN",
        color: "#fbbf24",
        bg: "rgba(251, 191, 36, 0.15)",
        icon: <TriangleAlert size={12} color="#fbbf24" />,
    },
    error: {
        label: "ERROR",
        color: "#f87171",
        bg: "rgba(248, 113, 113, 0.15)",
        icon: <CircleX size={12} color="#f87171" />,
    },
};

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
}

function LogRow({ item }: { item: LogEntry }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = LEVEL_CONFIG[item.level];

    return (
        <Pressable
            style={styles.logRow}
            onPress={() => setExpanded((p) => !p)}
        >
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
                        <ChevronUp size={14} color={COLORS.gray400} />
                    ) : (
                        <ChevronDown size={14} color={COLORS.gray400} />
                    )}
                </View>
            </View>
            <Text style={styles.summary} numberOfLines={expanded ? undefined : 2}>
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
    if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
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
    const logs = useStore(logger.logsAtom);
    const [filter, setFilter] = useState<LogLevel | null>(null);
    const { top: safeTop } = useSafeAreaInsets();

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
                    <Bug size={20} color={COLORS.white} />
                    <Text style={styles.headerTitle}>Logs</Text>
                    <Text style={styles.logCount}>{logs.length}</Text>
                </View>
                <Pressable
                    style={styles.clearButton}
                    onPress={() => logger.clear()}
                >
                    <Eraser size={16} color={COLORS.gray400} />
                </Pressable>
            </View>

            <View style={styles.filterRow}>
                {levels.map((level) => {
                    const active = filter === level;
                    const cfg = LEVEL_CONFIG[level];
                    return (
                        <Pressable
                            key={level}
                            style={[
                                styles.filterChip,
                                { borderColor: active ? cfg.color : COLORS.gray800 },
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
                                    { color: active ? cfg.color : COLORS.gray400 },
                                ]}
                            >
                                {cfg.label}
                            </Text>
                            {countByLevel[level] > 0 && (
                                <Text
                                    style={[
                                        styles.filterChipCount,
                                        { color: active ? cfg.color : COLORS.gray600 },
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
                        <X size={14} color={COLORS.gray400} />
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
                        <Bug size={32} color={COLORS.gray600} />
                        <Text style={styles.emptyText}>No logs yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "700",
    },
    logCount: {
        color: COLORS.gray600,
        fontSize: 14,
        fontWeight: "600",
    },
    clearButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: COLORS.bgCard,
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        paddingHorizontal: 16,
        paddingBottom: 12,
        alignItems: "center",
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.gray800,
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
        backgroundColor: COLORS.bgCard,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    logRow: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 10,
        padding: 12,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: COLORS.gray800,
    },
    logHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    levelBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
    },
    levelText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    timestamp: {
        color: COLORS.gray600,
        fontSize: 11,
        fontFamily: "monospace",
        flex: 1,
    },
    expandIcon: {
        marginLeft: "auto",
    },
    summary: {
        color: COLORS.white,
        fontSize: 13,
        fontFamily: "monospace",
        lineHeight: 18,
    },
    argsContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.gray800,
        gap: 4,
    },
    argText: {
        color: COLORS.gray400,
        fontSize: 12,
        fontFamily: "monospace",
        lineHeight: 16,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        color: COLORS.gray600,
        fontSize: 16,
    },
});
