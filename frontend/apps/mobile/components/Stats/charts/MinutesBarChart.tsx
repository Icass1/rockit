import { useState } from "react";
import { COLORS } from "@/constants/theme";
import type { StatsMinutesEntryResponse } from "@rockit/shared";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

interface MinutesBarChartProps {
    data: StatsMinutesEntryResponse[];
}

const CHART_HEIGHT = 180;
const LEFT_MARGIN = 40;
const RIGHT_PADDING = 8;
const MIN_BAR_WIDTH = 16;
const MAX_BAR_WIDTH = 40;
const BAR_GAP = 12;

interface TooltipState {
    visible: boolean;
    x: number;
    label: string;
    value: number;
}

export default function MinutesBarChart({ data }: MinutesBarChartProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        x: 0,
        label: "",
        value: 0,
    });

    if (data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
            </View>
        );
    }

    const maxVal = Math.max(...data.map((d) => d.minutes), 1);
    const availableWidth =
        Dimensions.get("window").width - LEFT_MARGIN - RIGHT_PADDING - 32;
    const calculatedWidth =
        (availableWidth - (data.length - 1) * BAR_GAP) / data.length;
    const barWidth = Math.min(
        MAX_BAR_WIDTH,
        Math.max(MIN_BAR_WIDTH, calculatedWidth)
    );

    const handleBarPress = (
        index: number,
        entry: StatsMinutesEntryResponse
    ) => {
        const x = LEFT_MARGIN + index * (barWidth + BAR_GAP) + barWidth / 2;
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const label = `${startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })} - ${endDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })}`;
        setSelectedIndex(index);
        setTooltip({ visible: true, x, label, value: entry.minutes });
    };

    const yAxisLabels = [
        0,
        Math.round(maxVal * 0.25),
        Math.round(maxVal * 0.5),
        Math.round(maxVal * 0.75),
        Math.round(maxVal),
    ];

    return (
        <View style={styles.wrapper}>
            {tooltip.visible && (
                <Pressable
                    style={[styles.tooltip, { left: tooltip.x - 50 }]}
                    onPress={() => {
                        setTooltip({ ...tooltip, visible: false });
                        setSelectedIndex(null);
                    }}
                >
                    <Text style={styles.tooltipLabel}>{tooltip.label}</Text>
                    <Text style={styles.tooltipValue}>
                        {tooltip.value.toFixed(1)} min
                    </Text>
                </Pressable>
            )}
            <View style={styles.container}>
                <View style={styles.yAxis}>
                    {yAxisLabels.reverse().map((val, i) => (
                        <Text key={i} style={styles.yAxisLabel}>
                            {val.toFixed(0)}
                        </Text>
                    ))}
                </View>
                <View style={styles.chartArea}>
                    <View style={styles.gridLines}>
                        {[0, 1, 2, 3].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.gridLine,
                                    { bottom: `${(i / 4) * 100}%` },
                                ]}
                            />
                        ))}
                    </View>
                    <View style={styles.barsContainer}>
                        {data.map((entry, index) => {
                            const barHeight =
                                (entry.minutes / maxVal) * CHART_HEIGHT;
                            const isSelected = selectedIndex === index;
                            return (
                                <Pressable
                                    key={index}
                                    style={styles.barWrapper}
                                    onPress={() => handleBarPress(index, entry)}
                                >
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: barHeight,
                                                width: barWidth,
                                                backgroundColor: isSelected
                                                    ? COLORS.accent
                                                    : selectedIndex !== null
                                                      ? "rgba(238,16,134,0.2)"
                                                      : "rgba(238,16,134,0.7)",
                                            },
                                        ]}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>
            <View style={[styles.labels, { marginLeft: LEFT_MARGIN }]}>
                {data.map((entry, index) => {
                    return (
                        <View
                            key={index}
                            style={[
                                styles.labelWrapper,
                                { width: barWidth + BAR_GAP },
                            ]}
                        >
                            <Text style={styles.dateLabel}>{entry.label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "relative",
    },
    container: {
        flexDirection: "row",
        height: CHART_HEIGHT,
    },
    yAxis: {
        width: LEFT_MARGIN,
        height: CHART_HEIGHT,
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingRight: 8,
    },
    yAxisLabel: {
        fontSize: 10,
        color: COLORS.gray600,
    },
    chartArea: {
        flex: 1,
        height: CHART_HEIGHT,
        position: "relative",
    },
    gridLines: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    gridLine: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: "rgba(38,38,38,0.5)",
    },
    barsContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        gap: BAR_GAP,
    },
    barWrapper: {
        alignItems: "center",
    },
    bar: {
        borderRadius: 4,
    },
    labels: {
        flexDirection: "row",
        marginTop: 8,
    },
    labelWrapper: {
        alignItems: "center",
        overflow: "hidden",
    },
    dateLabel: {
        fontSize: 9,
        color: COLORS.gray600,
        textAlign: "center",
    },
    emptyContainer: {
        height: CHART_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.gray600,
    },
    tooltip: {
        position: "absolute",
        top: -40,
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        padding: 8,
        zIndex: 10,
        minWidth: 100,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(38,38,38,0.8)",
    },
    tooltipLabel: {
        fontSize: 10,
        color: COLORS.gray600,
    },
    tooltipValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#ffffff",
    },
});
