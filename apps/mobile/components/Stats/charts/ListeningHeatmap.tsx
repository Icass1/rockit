import { useState } from "react";
import { COLORS } from "@/constants/theme";
import type { StatsHeatmapCellResponse } from "@rockit/shared";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";

interface ListeningHeatmapProps {
    data: StatsHeatmapCellResponse[];
}

const CELL_W = 14;
const CELL_H = 14;
const CELL_GAP = 2;
const LEFT_PAD = 32;
const TOP_PAD = 20;
const HOURS_START = 8;
const HOURS_END = 23;
const DAYS = 7;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cellColor(value: number, maxValue: number): string {
    if (value === 0) return "rgba(38,38,38,0.3)";
    const intensity = Math.min(value / maxValue, 1);
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(238,16,134,${alpha})`;
}

interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    hour: number;
    day: number;
    value: number;
}

export default function ListeningHeatmap({ data }: ListeningHeatmapProps) {
    const [selectedCell, setSelectedCell] = useState<{
        hour: number;
        day: number;
    } | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        x: 0,
        y: 0,
        hour: 0,
        day: 0,
        value: 0,
    });

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const heatmapWidth =
        LEFT_PAD + (HOURS_END - HOURS_START + 1) * (CELL_W + CELL_GAP);
    const heatmapHeight = TOP_PAD + DAYS * (CELL_H + CELL_GAP);

    const getCellData = (hour: number, day: number): number => {
        const cell = data.find((d) => d.hour === hour && d.day === day);
        return cell?.value || 0;
    };

    const handleCellPress = (
        hour: number,
        day: number,
        cellX: number,
        cellY: number
    ) => {
        const value = getCellData(hour, day);
        setSelectedCell({ hour, day });
        setTooltip({
            visible: true,
            x: cellX,
            y: cellY,
            hour,
            day,
            value,
        });
    };

    const hourLabels = [8, 10, 12, 14, 16, 18, 20, 22];

    return (
        <View style={styles.wrapper}>
            {tooltip.visible && (
                <View
                    style={[
                        styles.tooltip,
                        {
                            left: Math.min(tooltip.x, heatmapWidth - 100),
                            top: Math.max(tooltip.y - 50, 0),
                        },
                    ]}
                >
                    <Text style={styles.tooltipText}>
                        {DAY_LABELS[tooltip.day]} {tooltip.hour}:00
                    </Text>
                    <Text style={styles.tooltipValue}>
                        {tooltip.value > 0
                            ? `${tooltip.value} min`
                            : "No activity"}
                    </Text>
                </View>
            )}
            <Pressable
                onPress={() => {
                    setTooltip({ ...tooltip, visible: false });
                    setSelectedCell(null);
                }}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Svg width={heatmapWidth} height={heatmapHeight}>
                        {hourLabels.map((hour) => {
                            const hourIndex = hour - HOURS_START;
                            return (
                                <SvgText
                                    key={`hour-${hour}`}
                                    x={
                                        LEFT_PAD +
                                        hourIndex * (CELL_W + CELL_GAP) +
                                        CELL_W / 2
                                    }
                                    y={12}
                                    fill={COLORS.gray600}
                                    fontSize={8}
                                    textAnchor="middle"
                                >
                                    {hour}
                                </SvgText>
                            );
                        })}
                        {DAY_LABELS.map((label, dayIndex) => (
                            <SvgText
                                key={`day-${dayIndex}`}
                                x={LEFT_PAD - 6}
                                y={
                                    TOP_PAD +
                                    dayIndex * (CELL_H + CELL_GAP) +
                                    CELL_H / 2 +
                                    3
                                }
                                fill={COLORS.gray600}
                                fontSize={9}
                                textAnchor="end"
                            >
                                {label}
                            </SvgText>
                        ))}
                        <G>
                            {Array.from({ length: DAYS }, (_, day) =>
                                Array.from(
                                    { length: HOURS_END - HOURS_START + 1 },
                                    (_, hourOffset) => {
                                        const hour = HOURS_START + hourOffset;
                                        const value = getCellData(hour, day);
                                        const x =
                                            LEFT_PAD +
                                            hourOffset * (CELL_W + CELL_GAP);
                                        const y =
                                            TOP_PAD + day * (CELL_H + CELL_GAP);
                                        const isSelected =
                                            selectedCell?.hour === hour &&
                                            selectedCell?.day === day;
                                        return (
                                            <Rect
                                                key={`${hour}-${day}`}
                                                x={x}
                                                y={y}
                                                width={CELL_W}
                                                height={CELL_H}
                                                rx={2}
                                                fill={cellColor(
                                                    value,
                                                    maxValue
                                                )}
                                                stroke={
                                                    isSelected
                                                        ? "#ffffff"
                                                        : "transparent"
                                                }
                                                strokeWidth={isSelected ? 2 : 0}
                                                onPress={() =>
                                                    handleCellPress(
                                                        hour,
                                                        day,
                                                        x,
                                                        y
                                                    )
                                                }
                                            />
                                        );
                                    }
                                )
                            ).flat()}
                        </G>
                    </Svg>
                </ScrollView>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "relative",
    },
    scrollContent: {
        paddingRight: 16,
    },
    tooltip: {
        position: "absolute",
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        padding: 8,
        zIndex: 10,
        minWidth: 80,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(38,38,38,0.8)",
    },
    tooltipText: {
        fontSize: 10,
        color: COLORS.gray600,
    },
    tooltipValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#ffffff",
    },
});
