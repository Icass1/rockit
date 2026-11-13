import { useCallback, useMemo, useState } from "react";
import countries from "@/assets/data/radio-world.json";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import {
    isSearchResult,
    locatedRadioStations,
    type BaseSearchResultsItem,
    type BaseStationResponse,
} from "@rockit/shared";
import { IconButton, MediaIdentity, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Library, ListPlus, Play, Search, X } from "@rockit/ui/icons";
import {
    Pressable,
    Text,
    TextInput,
    View,
    type ListRenderItemInfo,
} from "react-native";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import MapViewport from "@/components/Radio/MapViewport";
import RadioMap from "@/components/Radio/RadioMap";

type Station = BaseStationResponse | BaseSearchResultsItem;
export default function RadioScreen() {
    const { vocabulary: v } = useVocabulary();
    const theme = useDesignTheme();
    const [query, setQuery] = useState("");
    const [submitted, setSubmitted] = useState("");
    const [country, setCountry] = useState("");
    const [busy, setBusy] = useState<string>();
    const [selected, setSelected] = useState<BaseStationResponse>();
    const resource = useAsyncResource(async () => {
        if (submitted) return rockIt.stationManager.search(submitted);
        if (country) return rockIt.stationManager.getByCountry(country);
        const response = await Http.getUserLibraryMedias();
        if (!response.isOk()) throw new Error(response.message);
        return response.result.stations.map((entry) => entry.item);
    }, `${submitted}|${country}`);
    const mapStations = useMemo(
        () =>
            locatedRadioStations(
                (resource.data ?? []).filter(
                    (item): item is BaseStationResponse => !isSearchResult(item)
                )
            ),
        [resource.data]
    );
    const chooseCountry = useCallback((name: string) => {
        setCountry(name);
        setSubmitted("");
        setQuery("");
        setSelected(undefined);
    }, []);
    const submit = () => {
        setCountry("");
        setSelected(undefined);
        setSubmitted(query.trim());
    };
    const act = async (item: Station, action: "play" | "queue" | "save") => {
        setBusy(item.name);
        try {
            const station = await rockIt.stationManager.resolve(item);
            if (action === "play")
                await rockIt.stationManager.setAndPlayStation(station);
            else if (action === "queue")
                rockIt.queueManager.addMediaToEnd(station);
            else {
                const result = await Http.addMediaToLibrary(station.publicId);
                if (!result.isOk()) throw new Error(result.message);
                toasterManager.notifySuccess(v.ADDED_TO_LIBRARY);
            }
        } catch {
            toasterManager.notifyError(v.RADIO_LOAD_ERROR);
        } finally {
            setBusy(undefined);
        }
    };
    const matches =
        query.trim().length < 2
            ? []
            : countries
                  .filter((item) =>
                      item.name
                          .toLocaleLowerCase()
                          .includes(query.trim().toLocaleLowerCase())
                  )
                  .slice(0, 5);
    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <MapViewport focusStations={country ? mapStations : undefined}>
                <RadioMap
                    selected={country}
                    onCountry={chooseCountry}
                    stations={mapStations}
                    onStation={setSelected}
                />
            </MapViewport>
            <View
                style={{
                    position: "absolute",
                    top: theme.layout.mobileContentTop,
                    left: theme.spacing.lg,
                    right: theme.spacing.lg,
                    gap: theme.spacing.sm,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: theme.colors.secondary,
                        borderRadius: theme.radius.full,
                        paddingHorizontal: theme.spacing.md,
                    }}
                >
                    <TextInput
                        placeholder={v.RADIO_SEARCH}
                        accessibilityLabel={v.RADIO_SEARCH}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={submit}
                        returnKeyType="search"
                        placeholderTextColor={theme.colors["muted-foreground"]}
                        style={{
                            flex: 1,
                            minHeight: theme.layout.touchTarget,
                            color: theme.colors.foreground,
                            paddingHorizontal: theme.spacing.sm,
                        }}
                    />
                    <IconButton label={v.SEARCH} onPress={submit}>
                        <Search color={theme.colors.foreground} />
                    </IconButton>
                </View>
                {matches.length > 0 && (
                    <View
                        style={{
                            backgroundColor: theme.colors.secondary,
                            borderRadius: theme.radius.lg,
                            padding: theme.spacing.sm,
                        }}
                    >
                        {matches.map((item) => (
                            <Pressable
                                key={item.name}
                                accessibilityRole="button"
                                accessibilityLabel={item.name}
                                onPress={() => chooseCountry(item.name)}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    justifyContent: "center",
                                    paddingHorizontal: theme.spacing.md,
                                }}
                            >
                                <Text
                                    style={{ color: theme.colors.foreground }}
                                >
                                    {item.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
            <BottomSheet
                index={0}
                snapPoints={[
                    `${theme.layout.radioResultsPeekPercent}%`,
                    `${theme.layout.radioResultsMidPercent}%`,
                    `${theme.layout.radioResultsMaxPercent}%`,
                ]}
                enableDynamicSizing={false}
                accessibilityLabel={v.RADIO_STATIONS}
                backgroundStyle={{ backgroundColor: theme.colors.secondary }}
                handleIndicatorStyle={{
                    backgroundColor: theme.colors["muted-foreground"],
                }}
            >
                <BottomSheetFlatList<Station>
                    ListHeaderComponent={
                        <View
                            testID="radio-results-header"
                            style={{
                                paddingBottom: theme.spacing.md,
                                gap: theme.spacing.md,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: theme.spacing.sm,
                                }}
                            >
                                <Text
                                    accessibilityRole="header"
                                    style={{
                                        flex: 1,
                                        color: theme.colors.foreground,
                                        fontSize: theme.typography.subtitle,
                                        fontWeight: "600",
                                    }}
                                >
                                    {country || submitted || v.RADIO_SAVED} ·{" "}
                                    {resource.data?.length ?? 0}
                                </Text>
                                {(country || submitted) && (
                                    <IconButton
                                        label={v.RADIO_CLEAR}
                                        onPress={() => chooseCountry("")}
                                    >
                                        <X color={theme.colors.foreground} />
                                    </IconButton>
                                )}
                            </View>
                            {selected && (
                                <View
                                    testID="radio-station-preview"
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: theme.spacing.sm,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <MediaIdentity
                                            title={selected.name}
                                            subtitle={selected.country ?? ""}
                                            imageUrl={selected.imageUrl}
                                        />
                                    </View>
                                    <IconButton
                                        label={`${v.PLAY}: ${selected.name}`}
                                        disabled={busy === selected.name}
                                        onPress={() =>
                                            void act(selected, "play")
                                        }
                                    >
                                        <Play
                                            color={
                                                theme.colors[
                                                    "foreground-strong"
                                                ]
                                            }
                                            fill={
                                                theme.colors[
                                                    "foreground-strong"
                                                ]
                                            }
                                        />
                                    </IconButton>
                                    <IconButton
                                        label={v.MOBILE_CLOSE}
                                        onPress={() => setSelected(undefined)}
                                    >
                                        <X color={theme.colors.foreground} />
                                    </IconButton>
                                </View>
                            )}
                            {resource.loading && (
                                <Text
                                    style={{
                                        color: theme.colors["muted-foreground"],
                                    }}
                                >
                                    {v.RADIO_LOADING}
                                </Text>
                            )}
                            {resource.error && (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void resource.refresh()}
                                >
                                    <Text
                                        style={{
                                            color: theme.colors.destructive,
                                        }}
                                    >
                                        {v.RADIO_LOAD_ERROR} · {v.RETRY}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    }
                    data={resource.data ?? []}
                    keyExtractor={(item: Station) =>
                        isSearchResult(item) ? item.providerUrl : item.publicId
                    }
                    initialNumToRender={10}
                    windowSize={5}
                    maxToRenderPerBatch={10}
                    contentContainerStyle={{
                        paddingHorizontal: theme.spacing.lg,
                        paddingBottom: theme.spacing.lg,
                        gap: theme.spacing.md,
                    }}
                    ListEmptyComponent={
                        !resource.loading ? (
                            <Text
                                style={{
                                    color: theme.colors["muted-foreground"],
                                }}
                            >
                                {v.RADIO_EMPTY1}
                            </Text>
                        ) : null
                    }
                    renderItem={({ item }: ListRenderItemInfo<Station>) => (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: theme.spacing.sm,
                            }}
                        >
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${v.PLAY}: ${item.name}`}
                                disabled={busy === item.name}
                                onPress={() => void act(item, "play")}
                                style={{ flex: 1 }}
                            >
                                <MediaIdentity
                                    title={item.name}
                                    subtitle={
                                        isSearchResult(item)
                                            ? item.provider
                                            : (item.country ?? "")
                                    }
                                    imageUrl={item.imageUrl}
                                />
                            </Pressable>
                            <IconButton
                                label={v.ADD_TO_QUEUE}
                                disabled={busy === item.name}
                                onPress={() => void act(item, "queue")}
                            >
                                <ListPlus color={theme.colors.foreground} />
                            </IconButton>
                            <IconButton
                                label={v.ADD_TO_LIBRARY}
                                disabled={busy === item.name}
                                onPress={() => void act(item, "save")}
                            >
                                <Library color={theme.colors.foreground} />
                            </IconButton>
                        </View>
                    )}
                />
            </BottomSheet>
        </View>
    );
}
