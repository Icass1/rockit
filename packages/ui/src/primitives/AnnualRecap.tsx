"use client";

import {
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type ComponentProps,
    type ReactNode,
    type Ref,
} from "react";
import type {
    AnnualRecapSlide,
    AnnualRecap as RecapData,
    Vocabulary,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import {
    useRecapClock,
    useRecapPlayback,
} from "@rockit/ui/headless/useRecapPlayback";
import {
    ArrowLeft,
    ArrowRight,
    Headphones,
    Pause,
    Play,
    RotateCcw,
    X,
} from "@rockit/ui/icons";
import { MediaArtwork } from "@rockit/ui/primitives/MediaArtwork";
import {
    ActivityIndicator,
    Animated,
    Image,
    nativeAnimations,
    Pressable,
    Text,
    View,
} from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export interface AnnualRecapControls {
    next: () => void;
    previous: () => void;
    toggle: () => void;
}

export function AnnualRecap({
    loadRecap,
    resourceKey,
    vocabulary: v,
    locale,
    logoSource = { uri: "/logo-banner.png" },
    onClose,
    onSelectYear,
    availableYears,
    ref,
}: {
    loadRecap: () => Promise<RecapData>;
    resourceKey: string;
    vocabulary: Vocabulary;
    locale: string;
    logoSource?: ComponentProps<typeof Image>["source"];
    onClose: () => void;
    onSelectYear?: (year: number) => void;
    availableYears?: number[];
    ref?: Ref<AnnualRecapControls>;
}) {
    const resource = useAsyncResource(loadRecap, resourceKey);
    const theme = useDesignTheme();
    if (resource.loading || resource.error)
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: theme.spacing.xl,
                    gap: theme.spacing.lg,
                    backgroundColor: theme.colors["recap-ink"],
                }}
            >
                {resource.loading ? (
                    <>
                        <ActivityIndicator
                            color={theme.colors["recap-accent"]}
                        />
                        <Text
                            style={{
                                color: theme.colors["recap-foreground"],
                                textAlign: "center",
                            }}
                        >
                            {v.RECAP_LOADING}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text
                            accessibilityRole="alert"
                            style={{ color: theme.colors["recap-foreground"] }}
                        >
                            {v.SOCIAL_ERROR}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => void resource.refresh()}
                            style={{ minHeight: theme.layout.touchTarget }}
                        >
                            <Text
                                style={{ color: theme.colors["recap-accent"] }}
                            >
                                {v.SOCIAL_RETRY}
                            </Text>
                        </Pressable>
                    </>
                )}
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={{ minHeight: theme.layout.touchTarget }}
                >
                    <Text style={{ color: theme.colors["recap-muted"] }}>
                        {v.RECAP_CLOSE}
                    </Text>
                </Pressable>
            </View>
        );
    if (!resource.data) return null;
    return (
        <RecapPresentation
            key={resourceKey}
            data={resource.data}
            v={v}
            locale={locale}
            logoSource={logoSource}
            onClose={onClose}
            onSelectYear={onSelectYear}
            availableYears={availableYears}
            ref={ref}
        />
    );
}

function Progress({
    count,
    index,
    running,
    next,
}: {
    count: number;
    index: number;
    running: boolean;
    next: () => void;
}) {
    const theme = useDesignTheme();
    const progress = useRecapClock(
        running,
        theme.motion.recapStoryDuration,
        theme.motion.recapProgressTick,
        next
    );
    return (
        <View
            testID="recap-progress"
            style={{ flexDirection: "row", gap: theme.spacing.xs }}
        >
            {Array.from({ length: count }, (_, number) => (
                <View
                    key={number}
                    style={{
                        flex: 1,
                        height: theme.spacing.xs,
                        backgroundColor: theme.colors["recap-track"],
                        borderRadius: theme.radius.full,
                        overflow: "hidden",
                    }}
                >
                    <View
                        testID={
                            number === index
                                ? "recap-current-progress"
                                : undefined
                        }
                        accessibilityValue={
                            number === index
                                ? {
                                      min: 0,
                                      max: 100,
                                      now: Math.round(progress * 100),
                                  }
                                : undefined
                        }
                        style={{
                            height: "100%",
                            width: `${(number < index || index === count - 1 ? 1 : number === index ? progress : 0) * 100}%`,
                            backgroundColor: theme.colors["recap-foreground"],
                        }}
                    />
                </View>
            ))}
        </View>
    );
}

function RecapPresentation({
    data,
    v,
    locale,
    logoSource,
    onClose,
    onSelectYear,
    availableYears,
    ref,
}: {
    data: RecapData;
    v: Vocabulary;
    locale: string;
    logoSource: ComponentProps<typeof Image>["source"];
    onClose: () => void;
    onSelectYear?: (year: number) => void;
    availableYears?: number[];
    ref?: Ref<AnnualRecapControls>;
}) {
    const theme = useDesignTheme();
    const flow = useRecapPlayback(data.slides.length);
    useImperativeHandle(
        ref,
        () => ({
            next: flow.next,
            previous: flow.previous,
            toggle: flow.toggle,
        }),
        [flow.next, flow.previous, flow.toggle]
    );
    const longPress = useRef(false);
    const [bodySize, setBodySize] = useState({ width: 320, height: 500 });
    const slide = data.slides[flow.index];
    const palettes = [
        "recap-ink",
        "recap-plum",
        "recap-blue",
        "recap-amber",
    ] as const;
    const backgroundColor =
        theme.colors[palettes[flow.index % palettes.length]];
    const text = (
        key: keyof Vocabulary,
        values: Record<string, string | number> = {}
    ) =>
        Object.entries(values).reduce(
            (copy, [name, value]) =>
                copy.replaceAll(
                    `{${name}}`,
                    typeof value === "number"
                        ? value.toLocaleString(locale)
                        : value
                ),
            v[key]
        );
    const date = (value: string) =>
        new Date(value).toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        });
    const fg = theme.colors["recap-foreground"],
        muted = theme.colors["recap-muted"];
    const control = (
        label: string,
        action: () => void,
        icon: ReactNode,
        disabled = false
    ) => (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            aria-disabled={disabled}
            disabled={disabled}
            onPress={action}
            style={{
                minWidth: theme.layout.touchTarget,
                minHeight: theme.layout.touchTarget,
                alignItems: "center",
                justifyContent: "center",
                opacity: disabled ? 0.35 : 1,
            }}
        >
            {icon}
        </Pressable>
    );
    return (
        <View
            testID="annual-recap"
            style={{
                flex: 1,
                backgroundColor,
                overflow: "hidden",
                padding: theme.spacing.lg,
                gap: theme.spacing.sm,
            }}
        >
            <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={{
                    position: "absolute",
                    width: theme.layout.recapMaxWidth,
                    height: theme.layout.recapMaxWidth,
                    borderRadius: theme.radius.full,
                    borderWidth: theme.spacing.xl,
                    borderColor: withAlpha(theme.colors["recap-accent"], 0.08),
                    top: theme.spacing.xl,
                    right: -theme.layout.recapMaxWidth / 2,
                }}
            />
            {!data.empty && (
                <Progress
                    key={flow.index}
                    count={data.slides.length}
                    index={flow.index}
                    running={flow.running}
                    next={flow.next}
                />
            )}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Image
                    source={logoSource}
                    resizeMode="contain"
                    accessibilityLabel="RockIt!"
                    style={{
                        width: theme.layout.recapLogoWidth,
                        height: theme.layout.touchTarget,
                    }}
                />
                <View style={{ flexDirection: "row" }}>
                    {!data.empty &&
                        flow.index > 0 &&
                        flow.index < data.slides.length - 1 &&
                        !flow.reduced &&
                        control(
                            flow.paused ? v.RECAP_RESUME : v.RECAP_PAUSE,
                            flow.toggle,
                            flow.paused ? (
                                <Play
                                    size={theme.typography.subtitle}
                                    color={fg}
                                />
                            ) : (
                                <Pause
                                    size={theme.typography.subtitle}
                                    color={fg}
                                />
                            )
                        )}
                    {control(
                        v.RECAP_CLOSE,
                        onClose,
                        <X size={theme.typography.subtitle} color={fg} />
                    )}
                </View>
            </View>
            <Text
                style={{
                    color: theme.colors["recap-accent"],
                    fontSize: theme.typography.caption,
                    fontWeight: "600",
                }}
            >
                {data.inProgress ? v.RECAP_PREVIEW : v.RECAP_COMPLETE} ·{" "}
                {data.year}
            </Text>
            {(flow.index === 0 || data.empty) &&
                onSelectYear &&
                availableYears && (
                    <View
                        style={{ flexDirection: "row", gap: theme.spacing.md }}
                    >
                        {availableYears.map((year) => (
                            <Pressable
                                key={year}
                                accessibilityRole="button"
                                accessibilityLabel={text("RECAP_OPEN", {
                                    year: String(year),
                                })}
                                accessibilityState={{
                                    selected: data.year === year,
                                }}
                                aria-pressed={data.year === year}
                                onPress={() => onSelectYear(year)}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    paddingHorizontal: theme.spacing.md,
                                    justifyContent: "center",
                                    borderRadius: theme.radius.full,
                                    backgroundColor:
                                        data.year === year
                                            ? theme.colors["recap-track"]
                                            : "transparent",
                                }}
                            >
                                <Text
                                    style={{
                                        color: fg,
                                        fontWeight:
                                            data.year === year ? "700" : "400",
                                    }}
                                >
                                    {year}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            {data.empty ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        gap: theme.spacing.lg,
                    }}
                >
                    <Text
                        accessibilityRole="header"
                        style={{
                            color: fg,
                            fontSize: theme.typography.heading,
                            fontWeight: "800",
                        }}
                    >
                        {v.RECAP_EMPTY_TITLE}
                    </Text>
                    <Text
                        style={{
                            color: muted,
                            fontSize: theme.typography.body,
                        }}
                    >
                        {v.RECAP_EMPTY_BODY}
                    </Text>
                </View>
            ) : (
                <>
                    <Pressable
                        testID="recap-story"
                        onLayout={({ nativeEvent }) =>
                            setBodySize(nativeEvent.layout)
                        }
                        accessible={false}
                        focusable={false}
                        onPressIn={() => {
                            longPress.current = false;
                            flow.held(true);
                        }}
                        onLongPress={() => {
                            longPress.current = true;
                        }}
                        onPressOut={() => flow.held(false)}
                        onPress={(event) => {
                            if (!longPress.current) {
                                if (
                                    event.nativeEvent.locationX <
                                    theme.layout.recapTapBackWidth
                                )
                                    flow.previous();
                                else flow.next();
                            }
                        }}
                        style={{ flex: 1, justifyContent: "center" }}
                    >
                        <Story
                            key={slide.id}
                            slide={slide}
                            year={data.year}
                            v={v}
                            locale={locale}
                            reduced={flow.reduced}
                            height={bodySize.height}
                            width={bodySize.width}
                        />
                    </Pressable>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: theme.spacing.md,
                        }}
                    >
                        {control(
                            v.RECAP_PREVIOUS,
                            flow.previous,
                            <ArrowLeft
                                size={theme.typography.title}
                                color={fg}
                            />,
                            flow.index === 0
                        )}
                        {flow.index === 0 ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={flow.next}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    justifyContent: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color: fg,
                                        fontSize: theme.typography.body,
                                        fontWeight: "600",
                                    }}
                                >
                                    {v.RECAP_START}
                                </Text>
                            </Pressable>
                        ) : flow.index === data.slides.length - 1 ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={onClose}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    justifyContent: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color: fg,
                                        fontSize: theme.typography.body,
                                        fontWeight: "600",
                                    }}
                                >
                                    {v.RECAP_DONE}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text
                                style={{
                                    color: muted,
                                    fontSize: theme.typography.caption,
                                }}
                            >
                                {flow.index + 1} / {data.slides.length}
                            </Text>
                        )}
                        {flow.index === data.slides.length - 1
                            ? control(
                                  v.RECAP_REPLAY,
                                  flow.restart,
                                  <RotateCcw
                                      size={theme.typography.title}
                                      color={fg}
                                  />
                              )
                            : control(
                                  v.RECAP_NEXT,
                                  flow.next,
                                  <ArrowRight
                                      size={theme.typography.title}
                                      color={fg}
                                  />
                              )}
                    </View>
                </>
            )}
            <Text style={{ color: muted, fontSize: theme.typography.caption }}>
                {text("RECAP_PERIOD", {
                    start: date(data.start),
                    end: date(
                        new Date(
                            Math.max(
                                Date.parse(data.start),
                                Date.parse(data.end) - 1
                            )
                        ).toISOString()
                    ),
                })}
            </Text>
            {flow.reduced && !data.empty && (
                <Text
                    style={{ color: muted, fontSize: theme.typography.caption }}
                >
                    {v.RECAP_MANUAL}
                </Text>
            )}
        </View>
    );
}

function Story({
    slide,
    year,
    v,
    locale,
    reduced,
    height,
    width,
}: {
    slide: AnnualRecapSlide;
    year: number;
    v: Vocabulary;
    locale: string;
    reduced: boolean;
    height: number;
    width: number;
}) {
    const theme = useDesignTheme();
    const art = Math.max(
        theme.layout.touchTarget,
        Math.min(
            theme.layout.recapArtMax,
            width - theme.spacing.xl,
            height * 0.32
        )
    );
    const compact = height < theme.layout.recapCompactHeight;
    const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
    useEffect(() => {
        const animation = Animated.timing(opacity, {
            toValue: 1,
            duration: reduced ? 0 : theme.motion.lyricsHighlight,
            useNativeDriver: nativeAnimations,
        });
        animation.start();
        return () => animation.stop();
    }, [opacity, reduced, theme.motion.lyricsHighlight]);
    const fg = theme.colors["recap-foreground"],
        muted = theme.colors["recap-muted"];
    const values = { ...slide.values, value: slide.value ?? 0 };
    const body = Object.entries(values).reduce(
        (copy, [name, value]) =>
            copy.replaceAll(
                `{${name}}`,
                typeof value === "number" ? value.toLocaleString(locale) : value
            ),
        v[slide.bodyKey]
    );
    return (
        <Animated.View
            style={{
                opacity,
                gap: compact ? theme.spacing.sm : theme.spacing.md,
                width: "100%",
            }}
        >
            <Text
                accessibilityRole="header"
                style={{
                    color: fg,
                    fontWeight: "800",
                    fontSize: compact
                        ? theme.typography.title
                        : theme.typography.heading,
                    lineHeight:
                        (compact
                            ? theme.typography.title
                            : theme.typography.heading) * 1.1,
                }}
            >
                {v[slide.titleKey]}
            </Text>
            {slide.kind === "intro" && (
                <Text
                    style={{
                        color: theme.colors["recap-accent"],
                        fontSize: Math.min(
                            theme.layout.recapYearNumber,
                            width * 0.3
                        ),
                        fontWeight: "900",
                        letterSpacing: -theme.spacing.xs,
                    }}
                >
                    {year}
                </Text>
            )}
            {slide.rank !== undefined && (
                <Text
                    testID="recap-artist-rank"
                    style={{
                        color: theme.colors["recap-highlight"],
                        fontSize: Math.min(
                            theme.layout.recapRankNumber,
                            height * 0.1
                        ),
                        fontWeight: "900",
                    }}
                >
                    #{slide.rank}
                </Text>
            )}
            {slide.item && slide.kind !== "summary" && (
                <View style={{ gap: theme.spacing.md }}>
                    <RecapArtwork
                        uri={slide.item.imageUrl}
                        label={slide.item.name}
                        size={art}
                        round={slide.kind === "artists"}
                    />
                    <Text
                        style={{
                            color: fg,
                            fontSize: theme.typography.title,
                            fontWeight: "700",
                        }}
                        numberOfLines={3}
                    >
                        {slide.item.name}
                    </Text>
                    {slide.item.subtitle && (
                        <Text
                            style={{
                                color: muted,
                                fontSize: theme.typography.body,
                            }}
                            numberOfLines={2}
                        >
                            {slide.item.subtitle}
                        </Text>
                    )}
                </View>
            )}
            {slide.month !== undefined && (
                <Text
                    style={{
                        color: theme.colors["recap-highlight"],
                        fontSize: theme.typography.heading,
                        fontWeight: "800",
                    }}
                >
                    {new Date(
                        Date.UTC(year, slide.month, 1)
                    ).toLocaleDateString(locale, {
                        month: "long",
                        timeZone: "UTC",
                    })}
                </Text>
            )}
            {slide.value !== undefined && (
                <View>
                    <Text
                        style={{
                            color: theme.colors["recap-highlight"],
                            fontSize: Math.min(
                                slide.kind === "insight"
                                    ? theme.layout.recapHeroNumber
                                    : theme.layout.recapTotalNumber,
                                width * 0.22
                            ),
                            fontWeight: "900",
                            letterSpacing: -theme.spacing.xs,
                        }}
                    >
                        {slide.value.toLocaleString(locale)}
                    </Text>
                    {["total", "month", "summary"].includes(slide.kind) && (
                        <Text
                            style={{
                                color: muted,
                                fontSize: theme.typography.body,
                            }}
                        >
                            {v.RECAP_MINUTES}
                        </Text>
                    )}
                </View>
            )}
            {slide.kind === "summary" && slide.item && (
                <Text
                    style={{
                        color: fg,
                        fontSize: theme.typography.title,
                        fontWeight: "700",
                    }}
                >
                    {slide.item.name}
                </Text>
            )}
            {slide.items && (
                <View style={{ gap: theme.spacing.md }}>
                    {slide.items.map((item, index) => (
                        <View
                            key={item.publicId}
                            style={{
                                flexDirection: "row",
                                gap: theme.spacing.sm,
                                alignItems: "center",
                            }}
                        >
                            <Text
                                style={{
                                    color: theme.colors["recap-accent"],
                                    fontSize: theme.typography.subtitle,
                                    width: theme.spacing.xl,
                                    fontWeight: "700",
                                }}
                            >
                                {index + 1}
                            </Text>
                            <RecapArtwork
                                uri={item.imageUrl}
                                label={item.name}
                                size={Math.min(
                                    theme.layout.recapListArtwork,
                                    height * 0.08
                                )}
                            />
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                    numberOfLines={2}
                                    style={{
                                        color: fg,
                                        fontSize: theme.typography.body,
                                        fontWeight: "600",
                                    }}
                                >
                                    {item.name}
                                </Text>
                                {item.subtitle && (
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            color: muted,
                                            fontSize: theme.typography.caption,
                                        }}
                                    >
                                        {item.subtitle}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}
            <Text
                style={{
                    color: muted,
                    fontSize: theme.typography.body,
                    lineHeight: theme.typography.body * 1.4,
                }}
            >
                {body}
            </Text>
            {slide.kind === "summary" && (
                <Text
                    style={{ color: muted, fontSize: theme.typography.caption }}
                >
                    {v.RECAP_METHOD}
                </Text>
            )}
        </Animated.View>
    );
}

function RecapArtwork({
    uri,
    label,
    size,
    round = false,
}: {
    uri?: string | null;
    label: string;
    size: number;
    round?: boolean;
}) {
    const theme = useDesignTheme();
    const [failed, setFailed] = useState<string>();
    return uri && uri !== failed ? (
        <MediaArtwork
            uri={uri}
            label={label}
            size={size}
            round={round}
            onError={() => setFailed(uri)}
        />
    ) : (
        <View
            role="img"
            accessibilityLabel={label}
            style={{
                width: size,
                height: size,
                borderRadius: round ? theme.radius.full : theme.radius.md,
                backgroundColor: theme.colors["recap-track"],
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Headphones
                size={size * 0.4}
                color={theme.colors["recap-accent"]}
            />
        </View>
    );
}
