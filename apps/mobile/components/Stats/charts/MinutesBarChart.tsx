import { useState } from "react";
import {
    formatHour,
    formatHourRange,
    utcIsoToLocalDate,
    type StatsMinutesEntryResponse,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme } from "@rockit/ui";
import { Pressable, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

const HEIGHT = 180;
const AXIS = 40;
export default function MinutesBarChart({
    data,
}: {
    data: StatsMinutesEntryResponse[];
}) {
    const theme = useDesignTheme();
    const { vocabulary: v, lang } = useVocabulary();
    const [width, setWidth] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const plot = Math.max(0, width - AXIS);
    const gap = Math.min(theme.spacing.xs, plot / Math.max(1, data.length * 2));
    const bar = Math.max(
        0,
        (plot - gap * (data.length - 1)) / Math.max(1, data.length)
    );
    const max = Math.max(1, ...data.map((x) => x.minutes));
    const stride = Math.max(
        1,
        Math.ceil(data.length / Math.max(1, Math.floor(plot / AXIS)))
    );
    const entry = selected === null ? undefined : data[selected];
    const label = (item: StatsMinutesEntryResponse) =>
        /^\d{2}:\d{2}$/.test(item.label)
            ? formatHourRange(
                  utcIsoToLocalDate(item.start),
                  utcIsoToLocalDate(item.end)
              )
            : utcIsoToLocalDate(item.start).toLocaleDateString(lang, {
                  month: "short",
                  day: "numeric",
              });
    return (
        <View
            testID="minutes-chart"
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            style={{ width: "100%", minWidth: 0 }}
        >
            {!data.length ? (
                <Text style={{ color: theme.colors["muted-foreground"] }}>
                    {v.MOBILE_NO_DATA}
                </Text>
            ) : (
                <>
                    {entry && (
                        <Pressable
                            onPress={() => setSelected(null)}
                            style={{
                                padding: theme.spacing.sm,
                                backgroundColor: theme.colors.secondary,
                                borderRadius: theme.radius.md,
                            }}
                        >
                            <Text style={{ color: theme.colors.foreground }}>
                                {label(entry)} · {entry.minutes.toFixed(1)}{" "}
                                {v.MINUTES}
                            </Text>
                        </Pressable>
                    )}
                    <View style={{ flexDirection: "row", height: HEIGHT }}>
                        <View
                            style={{
                                width: AXIS,
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                                paddingRight: theme.spacing.sm,
                            }}
                        >
                            {[1, 0.75, 0.5, 0.25, 0].map((value) => (
                                <Text
                                    key={value}
                                    style={{
                                        fontSize: theme.typography.caption,
                                        color: theme.colors["muted-foreground"],
                                    }}
                                >
                                    {Math.round(max * value)}
                                </Text>
                            ))}
                        </View>
                        <View
                            testID="minutes-chart-bars"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                flexDirection: "row",
                                alignItems: "flex-end",
                                gap,
                                overflow: "hidden",
                            }}
                        >
                            {data.map((item, index) => (
                                <Pressable
                                    key={`${item.start}-${index}`}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${label(item)} · ${item.minutes.toFixed(1)} ${v.MINUTES}`}
                                    onPress={() => setSelected(index)}
                                    style={{
                                        width: bar,
                                        height: HEIGHT,
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <View
                                        style={{
                                            height:
                                                (item.minutes / max) * HEIGHT,
                                            width: "100%",
                                            borderRadius: theme.radius.sm,
                                            backgroundColor: withAlpha(
                                                theme.colors.primary,
                                                selected === null ||
                                                    selected === index
                                                    ? 0.8
                                                    : 0.2
                                            ),
                                        }}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View
                        style={{
                            marginLeft: AXIS,
                            position: "relative",
                            height: theme.typography.caption + theme.spacing.sm,
                            marginTop: theme.spacing.sm,
                        }}
                    >
                        {data.flatMap((item, index) =>
                            index % stride
                                ? []
                                : [
                                      <Text
                                          key={`${item.start}-${index}`}
                                          numberOfLines={1}
                                          style={{
                                              position: "absolute",
                                              left: Math.max(
                                                  0,
                                                  Math.min(
                                                      plot - AXIS,
                                                      index * (bar + gap)
                                                  )
                                              ),
                                              width: Math.min(AXIS, plot),
                                              fontSize:
                                                  theme.typography.caption,
                                              color: theme.colors[
                                                  "muted-foreground"
                                              ],
                                          }}
                                      >
                                          {/^\d{2}:\d{2}$/.test(item.label)
                                              ? formatHour(
                                                    utcIsoToLocalDate(
                                                        item.start
                                                    )
                                                )
                                              : item.label}
                                      </Text>,
                                  ]
                        )}
                    </View>
                </>
            )}
        </View>
    );
}
