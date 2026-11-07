import { useEffect, useRef, useState } from "react";
import type { Vocabulary } from "@rockit/shared";
import { EPlatform } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import {
    IconButton,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { BarChart3, User, Users } from "@rockit/ui/icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { DateInputEvent } from "@/models/interfaces/dateInput";
import { Http } from "@/lib/http";
import useFetch from "@/lib/useFetch";
import { useVocabulary } from "@/lib/vocabulary";
import UserStats from "@/components/Stats/UserStats";
import DateInput from "@/components/ui/DateInput";

const RANGE_OPTIONS: { label: keyof Vocabulary; value: Range }[] = [
    { label: "MOBILE_STATS_WEEK", value: "7d" },
    { label: "MOBILE_STATS_MONTH", value: "30d" },
    { label: "MOBILE_STATS_YEAR", value: "1y" },
    { label: "MOBILE_STATS_CUSTOM", value: "custom" },
];

export type Range = "7d" | "30d" | "1y" | "custom";

function getRangeLabel(
    range: Range,
    vocabulary: Vocabulary,
    lang: string,
    customStart?: Date,
    customEnd?: Date
): string {
    switch (range) {
        case "7d":
            return vocabulary.MOBILE_STATS_WEEK;
        case "30d":
            return vocabulary.MOBILE_STATS_MONTH;
        case "1y":
            return vocabulary.MOBILE_STATS_YEAR;
        case "custom":
            return vocabulary.MOBILE_STATS_RANGE.replace(
                "{from}",
                customStart?.toLocaleDateString(lang) ?? "…"
            ).replace("{to}", customEnd?.toLocaleDateString(lang) ?? "…");
    }
}

function EmptySection({ label }: { label: string }) {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.emptyContainer}>
            <BarChart3 size={32} color={theme.legacy.bgCard} />
            <Text style={styles.emptyLabel}>{label}</Text>
            <Text style={styles.emptySubtitle}>{vocabulary.NO_DATA}</Text>
        </View>
    );
}

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
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { lang, vocabulary } = useVocabulary();
    const [section, setSection] = useState<"user" | "general" | "friends">(
        "user"
    );
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
            start: customStart?.toISOString() ?? null,
            end: customEnd?.toISOString() ?? null,
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
        if (!dateStr) return "Select date";
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
                                {vocabulary[opt.label]}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.sectionTabs}>
                    <IconButton
                        label={vocabulary.USER}
                        onPress={() => setSection("user")}
                    >
                        <User
                            size={20}
                            color={
                                section === "user"
                                    ? theme.legacy.accent
                                    : theme.legacy.gray600
                            }
                        />
                    </IconButton>
                    <IconButton
                        label={vocabulary.STATISTICS}
                        onPress={() => setSection("general")}
                    >
                        <BarChart3
                            size={20}
                            color={
                                section === "general"
                                    ? theme.legacy.accent
                                    : theme.legacy.gray600
                            }
                        />
                    </IconButton>
                    <IconButton
                        label={vocabulary.USERS_FRIENDS}
                        onPress={() => setSection("friends")}
                    >
                        <Users
                            size={20}
                            color={
                                section === "friends"
                                    ? theme.legacy.accent
                                    : theme.legacy.gray600
                            }
                        />
                    </IconButton>
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

            {section === "user" && (
                <>
                    {loading && <LoadingSkeleton />}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                {vocabulary.MOBILE_STATS_ERROR}
                                {error}
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
