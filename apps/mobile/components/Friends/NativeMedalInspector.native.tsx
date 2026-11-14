import {
    Component,
    useEffect,
    useId,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { ListeningBadgeResponse, Vocabulary } from "@rockit/shared";
import type { MedalBridgeCommand } from "@rockit/shared/models/types/medalBridge";
import { ListeningEmblem, MedalControls, useDesignTheme } from "@rockit/ui";
import {
    MEDAL_BRIDGE_PROTOCOL,
    medalBridgeColors,
    parseMedalEvent,
} from "@rockit/ui/headless/medalBridge";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { AppState, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type WebView from "react-native-webview";

let localDocument: Promise<string> | undefined;
function loadDocument() {
    localDocument ??= (async () => {
        const asset = await Asset.fromModule(
            require("@/assets/medals/viewer.html")
        ).downloadAsync();
        if (!asset.localUri) throw new Error("Local medal viewer unavailable");
        return new File(asset.localUri).text();
    })().catch((error) => {
        localDocument = undefined;
        throw error;
    });
    return localDocument;
}

class ViewerBoundary extends Component<
    { children: ReactNode; onFailure: () => void },
    { failed: boolean }
> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch() {
        this.props.onFailure();
    }
    render() {
        return this.state.failed ? null : this.props.children;
    }
}

/** A local, network-isolated WebGL document using exactly the web medal renderer. */
type NativeMedalInspectorProps = {
    badge: ListeningBadgeResponse;
    ownerName: string;
    vocabulary: Vocabulary;
    fill?: boolean;
};

export function NativeMedalInspector(props: NativeMedalInspectorProps) {
    const theme = useDesignTheme();
    return (
        <NativeViewer
            key={`${props.badge.key}:${props.ownerName}:${theme.mode}`}
            {...props}
        />
    );
}

function NativeViewer({
    badge,
    ownerName,
    vocabulary: v,
}: NativeMedalInspectorProps) {
    const theme = useDesignTheme();
    const id = useId();
    const [attempt, setAttempt] = useState(0);
    const instance = `${id}:${attempt}`;
    const [source, setSource] = useState<{
        html: string;
        Viewer: typeof WebView;
    } | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
        "loading"
    );
    const [active, setActive] = useState(
        AppState.currentState !== "background" &&
            AppState.currentState !== "inactive"
    );
    const web = useRef<WebView>(null);
    const sequence = useRef(0);
    const initialized = useRef(false);
    const send = (
        command:
            | Omit<
                  Extract<MedalBridgeCommand, { type: "init" }>,
                  "protocol" | "sequence"
              >
            | { type: "front" | "back" | "reset" | "dispose" }
            | { type: "visibility"; active: boolean }
    ) => {
        web.current?.postMessage(
            JSON.stringify({
                ...command,
                protocol: MEDAL_BRIDGE_PROTOCOL,
                sequence: ++sequence.current,
            })
        );
    };
    const initialize = () => {
        if (initialized.current) return;
        initialized.current = true;
        send({
            type: "init",
            instance,
            badge,
            ownerName,
            colors: medalBridgeColors(theme.colors),
        });
        send({ type: "visibility", active });
    };
    useEffect(() => {
        let live = true;
        initialized.current = false;
        sequence.current = 0;
        void Promise.all([
            loadDocument(),
            Promise.resolve().then(
                () =>
                    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Older native clients must be able to fall back if this module is missing.
                    require("react-native-webview") as typeof import("react-native-webview")
            ),
        ])
            .then(([html, module]) => {
                if (live) setSource({ html, Viewer: module.WebView });
            })
            .catch(() => {
                if (live) setStatus("unavailable");
            });
        return () => {
            live = false;
        };
    }, [attempt]);
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            const value = state === "active";
            setActive(value);
            web.current?.postMessage(
                JSON.stringify({
                    protocol: MEDAL_BRIDGE_PROTOCOL,
                    sequence: ++sequence.current,
                    type: "visibility",
                    active: value,
                })
            );
        });
        return () => subscription.remove();
    }, []);
    useEffect(() => {
        if (status !== "loading" || !active) return;
        const timer = setTimeout(() => setStatus("unavailable"), 20000);
        return () => clearTimeout(timer);
    }, [status, active, attempt]);
    const Viewer = source?.Viewer;
    return (
        <View
            testID="native-emblem-inspector"
            style={{ flex: 1, minHeight: 0, gap: theme.spacing.sm }}
        >
            <View
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors["medal-stage"],
                }}
            >
                {source && Viewer && status !== "unavailable" && (
                    <ViewerBoundary
                        key={instance}
                        onFailure={() => setStatus("unavailable")}
                    >
                        <Viewer
                            ref={web}
                            source={{ html: source.html }}
                            style={{
                                flex: 1,
                                backgroundColor: theme.colors["medal-stage"],
                            }}
                            accessibilityLabel={v.MEDAL_3D_LABEL}
                            originWhitelist={["*"]}
                            onShouldStartLoadWithRequest={(request) =>
                                request.url === "about:blank" ||
                                request.url.startsWith("data:text/html")
                            }
                            onMessage={(event) => {
                                const message = parseMedalEvent(
                                    event.nativeEvent.data
                                );
                                if (message?.type === "boot") initialize();
                                else if (
                                    message &&
                                    message.instance === instance
                                )
                                    setStatus(
                                        message.type === "ready"
                                            ? "ready"
                                            : "unavailable"
                                    );
                            }}
                            onError={() => setStatus("unavailable")}
                            onHttpError={() => setStatus("unavailable")}
                            onContentProcessDidTerminate={() =>
                                setStatus("unavailable")
                            }
                            onRenderProcessGone={() => setStatus("unavailable")}
                            scrollEnabled={false}
                            nestedScrollEnabled={false}
                            bounces={false}
                            overScrollMode="never"
                            javaScriptEnabled
                            domStorageEnabled={false}
                            setSupportMultipleWindows={false}
                            javaScriptCanOpenWindowsAutomatically={false}
                            allowsLinkPreview={false}
                            allowFileAccess={false}
                            allowFileAccessFromFileURLs={false}
                            allowUniversalAccessFromFileURLs={false}
                            sharedCookiesEnabled={false}
                            thirdPartyCookiesEnabled={false}
                            mixedContentMode="never"
                            textZoom={100}
                        />
                    </ViewerBoundary>
                )}
                {status !== "ready" && (
                    <View
                        pointerEvents="none"
                        accessibilityLiveRegion="polite"
                        style={{
                            position: "absolute",
                            inset: 0,
                            alignItems: "center",
                            justifyContent: "center",
                            gap: theme.spacing.md,
                            padding: theme.spacing.lg,
                        }}
                    >
                        <ListeningEmblem
                            variant={badge.visualVariant}
                            scope={badge.scope}
                            league={badge.league}
                            earned={!!badge.earnedAt}
                            size={theme.layout.medalFallbackSize}
                            renderFace={(xml, size) => (
                                <SvgXml xml={xml} width={size} height={size} />
                            )}
                        />
                        <Text
                            style={{
                                color: theme.colors["muted-foreground"],
                                fontSize: theme.typography.caption,
                                textAlign: "center",
                            }}
                        >
                            {status === "loading"
                                ? v.MEDAL_3D_LOADING
                                : v.MEDAL_3D_UNAVAILABLE}
                        </Text>
                    </View>
                )}
            </View>
            <MedalControls
                ready={status === "ready"}
                vocabulary={v}
                onFront={() => send({ type: "front" })}
                onBack={() => send({ type: "back" })}
                onReset={() => send({ type: "reset" })}
                onRetry={
                    status === "unavailable"
                        ? () => {
                              setStatus("loading");
                              setSource(null);
                              setAttempt((n) => n + 1);
                          }
                        : undefined
                }
            />
        </View>
    );
}
