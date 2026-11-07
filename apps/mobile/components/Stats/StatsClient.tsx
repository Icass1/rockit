import { useEffect, useRef, useState } from "react";
import {
    formatStatsRange as getRangeLabel,
    statsDateBoundary,
    statsRangeOptions,
    type StatsRange as Range,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { DateInputEvent } from "@/models/interfaces/dateInput";
import { Http } from "@/lib/http";
import useFetch from "@/lib/useFetch";
import { useVocabulary } from "@/lib/vocabulary";
import InsightsPanel from "@/components/Stats/InsightsPanel";
import UserStats from "@/components/Stats/UserStats";
import DateInput from "@/components/ui/DateInput";

function LoadingSkeleton() {
    const styles = useThemedStyles(createStyles);
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
    const styles = useThemedStyles(createStyles);
    const { lang, vocabulary } = useVocabulary();
    const [range, setRange] = useState<Range>("7d");
    const [customStart, setCustomStart] = useState<Date>();
    const [customEnd, setCustomEnd] = useState<Date>();
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(new Date());
    const [tempEndDate, setTempEndDate] = useState(new Date());

    const { data, error, loading, update } = useFetch(() =>
        Http.getUserStats({
            range: range,
            start:
                range === "custom" && customStart
                    ? statsDateBoundary(customStart, "start")
                    : null,
            end:
                range === "custom" && customEnd
                    ? statsDateBoundary(customEnd, "end")
                    : null,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        })
    );

    const updateRef = useRef(update);
    useEffect(() => {
        updateRef.current = update;
    }, [update]);

    useEffect(() => {
        updateRef.current();
    }, [range, customStart, customEnd]);

    function formatDateForDisplay(dateStr: Date | undefined): string {
        if (!dateStr) return vocabulary.MOBILE_DATE_FROM;
        const date = new Date(dateStr);
        return date.toLocaleDateString(lang, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function onStartDateChange(_event: DateInputEvent, selectedDate?: Date) {
        if (Platform.OS !== "ios") {
            setShowStartPicker(false);
        }
        if (selectedDate) {
            setTempStartDate(selectedDate);
            setCustomStart(selectedDate);
        }
    }

    function onEndDateChange(_event: DateInputEvent, selectedDate?: Date) {
        if (Platform.OS !== "ios") {
            setShowEndPicker(false);
        }
        if (selectedDate) {
            setTempEndDate(selectedDate);
            setCustomEnd(selectedDate);
        }
    }

    function openStartPicker() {
        if (customStart) {
            setTempStartDate(customStart);
        } else {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            setTempStartDate(d);
        }
        setShowStartPicker(true);
    }

    function openEndPicker() {
        if (customEnd) {
            setTempEndDate(customEnd);
        } else {
            setTempEndDate(new Date());
        }
        setShowEndPicker(true);
    }

    function handleRangeChange(newRange: Range) {
        setRange(newRange);
        if (newRange !== "custom") {
            setCustomStart(new Date());
            setCustomEnd(new Date());
        }
    }

    const rangeLabel = getRangeLabel(
        range,
        vocabulary,
        lang,
        customStart,
        customEnd
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{vocabulary.STATS}</Text>
            <Text style={styles.subtitle}>
                {vocabulary.MOBILE_STATS_FOR} {rangeLabel}
            </Text>

            <View style={styles.controls}>
                <View style={styles.rangePills}>
                    {statsRangeOptions(vocabulary).map((opt) => (
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
                    <Text style={styles.dateSeparator}>{vocabulary.TO}</Text>
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

            {showStartPicker && (
                <View style={styles.pickerContainer}>
                    <Pressable onPress={() => setShowStartPicker(false)}>
                        <Text style={styles.pickerDone}>
                            {vocabulary.CANCEL}
                        </Text>
                    </Pressable>
                    <DateInput
                        label={vocabulary.MOBILE_DATE_FROM}
                        value={tempStartDate}
                        onChange={onStartDateChange}
                        maximumDate={new Date()}
                    />
                </View>
            )}

            {showEndPicker && (
                <View style={styles.pickerContainer}>
                    <Pressable onPress={() => setShowEndPicker(false)}>
                        <Text style={styles.pickerDone}>
                            {vocabulary.CANCEL}
                        </Text>
                    </Pressable>
                    <DateInput
                        label={vocabulary.MOBILE_DATE_TO}
                        value={tempEndDate}
                        onChange={onEndDateChange}
                        maximumDate={new Date()}
                    />
                </View>
            )}

            {loading && <LoadingSkeleton />}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {vocabulary.MOBILE_STATS_ERROR}
                    </Text>
                </View>
            )}
            {data && (
                <>
                    <UserStats data={data} rangeLabel={rangeLabel} />
                    <InsightsPanel
                        filter={{
                            range,
                            start:
                                range === "custom" && customStart
                                    ? statsDateBoundary(customStart, "start")
                                    : null,
                            end:
                                range === "custom" && customEnd
                                    ? statsDateBoundary(customEnd, "end")
                                    : null,
                            timezoneOffsetMinutes:
                                new Date().getTimezoneOffset(),
                        }}
                    />
                </>
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            gap: theme.spacing.md,
        },
        title: {
            fontSize: 20,
            fontWeight: "bold",
            color: theme.colors["foreground-strong"],
        },
        subtitle: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray600,
        },
        controls: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginVertical: theme.spacing.sm,
        },
        rangePills: {
            flexDirection: "row",
            gap: theme.spacing.sm,
        },
        pill: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 6,
            borderRadius: theme.radius.xl,
            backgroundColor: theme.legacy.bgCard,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["surface-raised"], 0.5),
        },
        pillActive: {
            backgroundColor: theme.legacy.accent,
            borderColor: theme.legacy.accent,
        },
        pillText: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray600,
        },
        pillTextActive: {
            color: theme.colors["foreground-strong"],
            fontWeight: "600",
        },
        sectionTabs: {
            flexDirection: "row",
            gap: theme.spacing.lg,
        },
        customDates: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        dateInput: {
            flex: 1,
            backgroundColor: theme.legacy.bgCard,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["surface-raised"], 0.5),
        },
        dateText: {
            fontSize: theme.typography.body,
            color: theme.colors["foreground-strong"],
        },
        datePlaceholder: {
            color: theme.legacy.gray600,
        },
        dateSeparator: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray600,
        },
        pickerContainer: {
            backgroundColor: theme.legacy.bgCard,
            borderRadius: theme.radius.lg,
            marginTop: theme.spacing.sm,
            overflow: "hidden",
        },
        pickerHeader: {
            flexDirection: "row",
            justifyContent: "flex-end",
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: withAlpha(theme.colors["surface-raised"], 0.5),
        },
        pickerDone: {
            fontSize: theme.typography.label,
            color: theme.legacy.accent,
            fontWeight: "600",
        },
        emptyContainer: {
            height: 200,
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.md,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.legacy.bgCard,
            borderStyle: "dashed",
        },
        emptyLabel: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.gray600,
        },
        emptySubtitle: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray600,
        },
        skeletonContainer: {
            gap: theme.spacing.md,
        },
        skeleton: {
            height: 80,
            backgroundColor: theme.legacy.bgCard,
            borderRadius: theme.radius.xl,
        },
        errorContainer: {
            padding: theme.spacing.lg,
            backgroundColor: withAlpha(theme.colors["provider-youtube"], 0.1),
            borderRadius: theme.radius.md,
        },
        errorText: {
            color: theme.colors["destructive"],
            fontSize: theme.typography.body,
        },
    });
