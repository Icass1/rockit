import { useState } from "react";
import {
    isSearchResult,
    type BaseSearchResultsItem,
    type BaseStationResponse,
} from "@rockit/shared";
import { IconButton, MediaIdentity, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Library, ListPlus } from "@rockit/ui/icons";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function RadioScreen() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const [query, setQuery] = useState("");
    const [submitted, setSubmitted] = useState("");
    const [busy, setBusy] = useState<string>();
    const resource = useAsyncResource(async () => {
        if (submitted) return rockIt.stationManager.search(submitted);
        const response = await Http.getUserLibraryMedias();
        if (!response.isOk()) throw new Error(response.message);
        return response.result.stations.map((entry) => entry.item);
    }, submitted);
    const act = async (
        item: BaseStationResponse | BaseSearchResultsItem,
        action: "play" | "queue" | "save"
    ) => {
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
                toasterManager.notifySuccess(vocabulary.ADDED_TO_LIBRARY);
            }
        } catch {
            toasterManager.notifyError(vocabulary.RADIO_LOAD_ERROR);
        } finally {
            setBusy(undefined);
        }
    };
    return (
        <FlatList<BaseStationResponse | BaseSearchResultsItem>
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            data={resource.data ?? []}
            keyExtractor={(item) =>
                isSearchResult(item) ? item.providerUrl : item.publicId
            }
            contentContainerStyle={{
                paddingTop: theme.layout.mobileContentTop,
                paddingBottom: theme.layout.mobileContentBottom,
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.md,
            }}
            initialNumToRender={10}
            windowSize={5}
            maxToRenderPerBatch={10}
            ListHeaderComponent={
                <View style={{ gap: theme.spacing.md }}>
                    <Text
                        style={{
                            color: theme.colors.foreground,
                            fontSize: theme.typography.heading,
                        }}
                    >
                        {vocabulary.RADIO}
                    </Text>
                    <TextInput
                        placeholder={vocabulary.RADIO_SEARCH}
                        accessibilityLabel={vocabulary.RADIO_SEARCH}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => setSubmitted(query.trim())}
                        returnKeyType="search"
                        style={{
                            minHeight: theme.layout.touchTarget,
                            color: theme.colors.foreground,
                            backgroundColor: theme.colors.secondary,
                            borderRadius: theme.radius.md,
                            padding: theme.spacing.md,
                        }}
                    />
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setSubmitted(query.trim())}
                    >
                        <Text style={{ color: theme.colors.primary }}>
                            {vocabulary.SEARCH}
                        </Text>
                    </Pressable>
                    {submitted && (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                                setQuery("");
                                setSubmitted("");
                            }}
                        >
                            <Text style={{ color: theme.colors.primary }}>
                                {vocabulary.RADIO_SAVED}
                            </Text>
                        </Pressable>
                    )}
                    {resource.loading && (
                        <Text
                            style={{ color: theme.colors["muted-foreground"] }}
                        >
                            {vocabulary.RADIO_LOADING}
                        </Text>
                    )}
                    {resource.error && (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => void resource.refresh()}
                        >
                            <Text style={{ color: theme.colors.destructive }}>
                                {vocabulary.RADIO_LOAD_ERROR}
                            </Text>
                        </Pressable>
                    )}
                </View>
            }
            ListEmptyComponent={
                !resource.loading ? (
                    <Text style={{ color: theme.colors["muted-foreground"] }}>
                        {vocabulary.RADIO_EMPTY1}
                    </Text>
                ) : null
            }
            renderItem={({ item }) => (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                    }}
                >
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${vocabulary.PLAY}: ${item.name}`}
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
                        label={vocabulary.ADD_TO_QUEUE}
                        disabled={busy === item.name}
                        onPress={() => void act(item, "queue")}
                    >
                        <ListPlus color={theme.colors.foreground} />
                    </IconButton>
                    <IconButton
                        label={vocabulary.ADD_TO_LIBRARY}
                        disabled={busy === item.name}
                        onPress={() => void act(item, "save")}
                    >
                        <Library color={theme.colors.foreground} />
                    </IconButton>
                </View>
            )}
        />
    );
}
