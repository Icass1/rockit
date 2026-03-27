import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useUserStats, type Range } from "@/hooks/useUserStats";
import UserStats from "./UserStats";

const RANGE_OPTIONS: { label: string; value: Range }[] = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "1 year", value: "1y" },
    { label: "Custom", value: "custom" },
];

function getRangeLabel(
    range: Range,
    customStart?: string,
    customEnd?: string
): string {
    switch (range) {
        case "7d":
            return "last 7 days";
        case "30d":
            return "last 30 days";
        case "1y":
            return "last year";
        case "custom":
            return `${customStart || "..."} to ${customEnd || "..."}`;
    }
}

function EmptySection({ label }: { label: string }) {
    return (
        <View style={styles.emptyContainer}>
            <Feather name="bar-chart-2" size={32} color={COLORS.bgCard} />
            <Text style={styles.emptyLabel}>{label}</Text>
            <Text style={styles.emptySubtitle}>
                Available once backend stats endpoints are ready
            </Text>
        </View>
    );
}

function LoadingSkeleton() {
    return (
        <View style={styles.skeletonContainer}>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
        </View>
    );
}

export default function StatsClient() {
    const [section, setSection] = useState<"user" | "general" | "friends">(
        "user"
    );
    const [range, setRange] = useState<Range>("7d");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(new Date());
    const [tempEndDate, setTempEndDate] = useState(new Date());

    const { data, loading, error } = useUserStats({
        range,
        customStart,
        customEnd,
    });

    function formatDateForApi(date: Date): string {
        return date.toISOString().split("T")[0];
    }

    function formatDateForDisplay(dateStr: string): string {
        if (!dateStr) return "Select date";
        const parts = dateStr.split("-");
        if (parts.length !== 3) return dateStr;
        const date = new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
        );
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function parseApiDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        const parts = dateStr.split("-");
        if (parts.length !== 3) return new Date();
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
        );
    }

    function onStartDateChange(
        _event: DateTimePickerEvent,
        selectedDate?: Date
    ) {
        if (Platform.OS === "android") {
            setShowStartPicker(false);
        }
        if (selectedDate) {
            setTempStartDate(selectedDate);
            setCustomStart(formatDateForApi(selectedDate));
        }
    }

    function onEndDateChange(_event: DateTimePickerEvent, selectedDate?: Date) {
        if (Platform.OS === "android") {
            setShowEndPicker(false);
        }
        if (selectedDate) {
            setTempEndDate(selectedDate);
            setCustomEnd(formatDateForApi(selectedDate));
        }
    }

    function openStartPicker() {
        if (customStart) {
            setTempStartDate(parseApiDate(customStart));
        } else {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            setTempStartDate(d);
        }
        setShowStartPicker(true);
    }

    function openEndPicker() {
        if (customEnd) {
            setTempEndDate(parseApiDate(customEnd));
        } else {
            setTempEndDate(new Date());
        }
        setShowEndPicker(true);
    }

    function handleRangeChange(newRange: Range) {
        setRange(newRange);
        if (newRange !== "custom") {
            setCustomStart("");
            setCustomEnd("");
        }
    }

    const rangeLabel = getRangeLabel(range, customStart, customEnd);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Stats</Text>
            <Text style={styles.subtitle}>Showing stats for {rangeLabel}</Text>

            <View style={styles.controls}>
                <View style={styles.rangePills}>
                    {RANGE_OPTIONS.map((opt) => (
                        <Pressable
                            key={opt.value}
                            style={[
                                styles.pill,
                                range === opt.value && styles.pillActive,
                            ]}
                            onPress={() => handleRangeChange(opt.value)}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    range === opt.value &&
                                        styles.pillTextActive,
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.sectionTabs}>
                    <Feather
                        name="user"
                        size={20}
                        color={
                            section === "user" ? COLORS.accent : COLORS.gray600
                        }
                        onPress={() => setSection("user")}
                    />
                    <Feather
                        name="bar-chart-2"
                        size={20}
                        color={
                            section === "general"
                                ? COLORS.accent
                                : COLORS.gray600
                        }
                        onPress={() => setSection("general")}
                    />
                    <Feather
                        name="users"
                        size={20}
                        color={
                            section === "friends"
                                ? COLORS.accent
                                : COLORS.gray600
                        }
                        onPress={() => setSection("friends")}
                    />
                </View>
            </View>

            {range === "custom" && (
                <View style={styles.customDates}>
                    <Pressable
                        style={styles.dateInput}
                        onPress={openStartPicker}
                    >
                        <Text
                            style={[
                                styles.dateText,
                                !customStart && styles.datePlaceholder,
                            ]}
                        >
                            {formatDateForDisplay(customStart)}
                        </Text>
                    </Pressable>
                    <Text style={styles.dateSeparator}>to</Text>
                    <Pressable style={styles.dateInput} onPress={openEndPicker}>
                        <Text
                            style={[
                                styles.dateText,
                                !customEnd && styles.datePlaceholder,
                            ]}
                        >
                            {formatDateForDisplay(customEnd)}
                        </Text>
                    </Pressable>
                </View>
            )}

            {Platform.OS === "ios" && showStartPicker && (
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                        <Pressable onPress={() => setShowStartPicker(false)}>
                            <Text style={styles.pickerDone}>Done</Text>
                        </Pressable>
                    </View>
                    <DateTimePicker
                        value={tempStartDate}
                        mode="date"
                        display="spinner"
                        onChange={onStartDateChange}
                        maximumDate={new Date()}
                        textColor="#ffffff"
                    />
                </View>
            )}

            {Platform.OS === "ios" && showEndPicker && (
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                        <Pressable onPress={() => setShowEndPicker(false)}>
                            <Text style={styles.pickerDone}>Done</Text>
                        </Pressable>
                    </View>
                    <DateTimePicker
                        value={tempEndDate}
                        mode="date"
                        display="spinner"
                        onChange={onEndDateChange}
                        maximumDate={new Date()}
                        textColor="#ffffff"
                    />
                </View>
            )}

            {Platform.OS === "android" && showStartPicker && (
                <DateTimePicker
                    value={tempStartDate}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                    maximumDate={new Date()}
                />
            )}

            {Platform.OS === "android" && showEndPicker && (
                <DateTimePicker
                    value={tempEndDate}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                    maximumDate={new Date()}
                />
            )}

            {section === "user" && (
                <>
                    {loading && <LoadingSkeleton />}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                Error loading stats: {error}
                            </Text>
                        </View>
                    )}
                    {data && <UserStats data={data} rangeLabel={rangeLabel} />}
                </>
            )}
            {section === "general" && <EmptySection label="General Stats" />}
            {section === "friends" && <EmptySection label="Friends Stats" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ffffff",
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.gray600,
    },
    controls: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 8,
    },
    rangePills: {
        flexDirection: "row",
        gap: 8,
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: "rgba(38,38,38,0.5)",
    },
    pillActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    pillText: {
        fontSize: 12,
        color: COLORS.gray600,
    },
    pillTextActive: {
        color: "#ffffff",
        fontWeight: "600",
    },
    sectionTabs: {
        flexDirection: "row",
        gap: 16,
    },
    customDates: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateInput: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "rgba(38,38,38,0.5)",
    },
    dateText: {
        fontSize: 14,
        color: "#ffffff",
    },
    datePlaceholder: {
        color: COLORS.gray600,
    },
    dateSeparator: {
        fontSize: 12,
        color: COLORS.gray600,
    },
    pickerContainer: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 12,
        marginTop: 8,
        overflow: "hidden",
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(38,38,38,0.5)",
    },
    pickerDone: {
        fontSize: 16,
        color: COLORS.accent,
        fontWeight: "600",
    },
    emptyContainer: {
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.bgCard,
        borderStyle: "dashed",
    },
    emptyLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.gray600,
    },
    emptySubtitle: {
        fontSize: 12,
        color: COLORS.gray600,
    },
    skeletonContainer: {
        gap: 12,
    },
    skeleton: {
        height: 80,
        backgroundColor: COLORS.bgCard,
        borderRadius: 16,
    },
    errorContainer: {
        padding: 16,
        backgroundColor: "rgba(255,0,0,0.1)",
        borderRadius: 8,
    },
    errorText: {
        color: "#ff6b6b",
        fontSize: 14,
    },
});
