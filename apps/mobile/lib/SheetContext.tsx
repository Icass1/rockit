import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { COLORS } from "@/constants/theme";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetView,
    type BottomSheetBackdropProps,
    type BottomSheetModal as BottomSheetModalType,
} from "@gorhom/bottom-sheet";
import {
    Dimensions,
    Platform,
    StyleSheet,
    type LayoutChangeEvent,
} from "react-native";
import { logSheetDebug } from "@/lib/sheetDebug";

export interface SheetOptions {
    content: ReactNode;
    snapPoints?: (string | number)[];
    scrollable?: boolean;
    onClose?: () => void;
    debugLabel?: string;
}

interface SheetContextValue {
    open: (options: SheetOptions) => void;
    close: () => void;
}

const SheetContext = createContext<SheetContextValue>({
    open: () => logSheetDebug("open.missingProvider"),
    close: () => logSheetDebug("close.missingProvider"),
});

export function useSheet() {
    return useContext(SheetContext);
}

export function SheetProvider({ children }: { children: ReactNode }) {
    const sheetRef = useRef<BottomSheetModalType>(null);
    const isPresented = useRef(false);
    const isDismissing = useRef(false);
    const pendingOptions = useRef<SheetOptions | null>(null);
    const closeCallback = useRef<(() => void) | undefined>(undefined);
    const lastIndex = useRef(-1);
    const debugLabel = useRef<string | undefined>(undefined);
    const [options, setOptions] = useState<SheetOptions | null>(null);

    const logState = useCallback((event: string) => {
        logSheetDebug(event, {
            label: debugLabel.current,
            hasRef: !!sheetRef.current,
            isPresented: isPresented.current,
            isDismissing: isDismissing.current,
            hasPendingOptions: !!pendingOptions.current,
            lastIndex: lastIndex.current,
        });
    }, []);

    const attachSheetRef = useCallback(
        (instance: BottomSheetModalType | null) => {
            sheetRef.current = instance;
            logState(instance ? "modal.ref.attached" : "modal.ref.detached");
        },
        [logState]
    );

    useEffect(() => {
        logSheetDebug("provider.mount", {
            platform: Platform.OS,
            platformVersion: Platform.Version,
            window: Dimensions.get("window"),
            screen: Dimensions.get("screen"),
        });
        return () => logState("provider.unmount");
    }, [logState]);

    const close = useCallback(() => {
        logState("close.request");
        pendingOptions.current = null;
        if (isDismissing.current) {
            logState("close.alreadyDismissing");
            return;
        }
        if (!isPresented.current) {
            const callback = closeCallback.current;
            isDismissing.current = false;
            closeCallback.current = undefined;
            setOptions(null);
            logState("close.beforePresentation");
            callback?.();
            return;
        }

        isDismissing.current = true;
        logState("modal.dismiss.call");
        sheetRef.current?.dismiss();
    }, [logState]);

    const open = useCallback(
        (nextOptions: SheetOptions) => {
            logSheetDebug("open.request", {
                label: nextOptions.debugLabel,
                snapPoints: nextOptions.snapPoints,
                scrollable: !!nextOptions.scrollable,
                hasContent: !!nextOptions.content,
            });
            logState("open.state");
            // Wait for dismissal before replacing the previous sheet's content
            // and callback. Only an explicit open request queues another sheet.
            if (isDismissing.current) {
                pendingOptions.current = nextOptions;
                logState("open.queuedDuringDismissal");
                return;
            }
            closeCallback.current = nextOptions.onClose;
            debugLabel.current = nextOptions.debugLabel;
            setOptions(nextOptions);
        },
        [logState]
    );

    useEffect(() => {
        logSheetDebug("options.commit", {
            label: options?.debugLabel,
            hasOptions: !!options,
            snapPoints: options?.snapPoints,
        });
        if (
            !options ||
            !sheetRef.current ||
            isPresented.current ||
            isDismissing.current
        ) {
            logState("present.skipped");
            return;
        }

        isPresented.current = true;
        logState("modal.present.call");
        sheetRef.current.present();
        const timer = setTimeout(() => logState("present.after1500ms"), 1500);
        return () => clearTimeout(timer);
    }, [options, logState]);

    const handleDismiss = useCallback(() => {
        logState("modal.onDismiss");
        const callback = closeCallback.current;
        const nextOptions = pendingOptions.current;
        pendingOptions.current = null;
        isPresented.current = false;
        isDismissing.current = false;
        lastIndex.current = -1;
        debugLabel.current = nextOptions?.debugLabel;
        closeCallback.current = nextOptions?.onClose;
        setOptions(nextOptions);
        callback?.();
    }, [logState]);

    const handleAnimate = useCallback(
        (
            fromIndex: number,
            toIndex: number,
            fromPosition: number,
            toPosition: number
        ) => {
            logSheetDebug("modal.onAnimate", {
                label: debugLabel.current,
                fromIndex,
                toIndex,
                fromPosition,
                toPosition,
            });
            if (toIndex === -1) isDismissing.current = true;
        },
        []
    );

    const handleChange = useCallback(
        (index: number, position: number) => {
            lastIndex.current = index;
            logSheetDebug("modal.onChange", {
                label: debugLabel.current,
                index,
                position,
            });
            // dismiss() can be called before present() has mounted the native
            // sheet. Honor that close request once the opening animation finishes.
            if (index >= 0 && isDismissing.current) {
                logState("modal.dismiss.afterOpening");
                sheetRef.current?.dismiss();
            }
        },
        [logState]
    );

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    );

    return (
        <BottomSheetModalProvider>
            <SheetContext.Provider value={{ open, close }}>
                {children}
                <BottomSheetModal
                    ref={attachSheetRef}
                    index={0}
                    snapPoints={options?.snapPoints ?? ["70%"]}
                    enableDynamicSizing={false}
                    enableContentPanningGesture={false}
                    enableHandlePanningGesture
                    enablePanDownToClose
                    backdropComponent={renderBackdrop}
                    backgroundStyle={styles.background}
                    handleIndicatorStyle={styles.handle}
                    onDismiss={handleDismiss}
                    onAnimate={handleAnimate}
                    onChange={handleChange}
                >
                    {options?.scrollable ? (
                        <BottomSheetScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            onLayout={({ nativeEvent }: LayoutChangeEvent) =>
                                logSheetDebug("scrollView.layout", {
                                    label: debugLabel.current,
                                    ...nativeEvent.layout,
                                })
                            }
                            onContentSizeChange={(
                                width: number,
                                height: number
                            ) =>
                                logSheetDebug("scrollView.contentSize", {
                                    label: debugLabel.current,
                                    width,
                                    height,
                                })
                            }
                        >
                            {options.content}
                        </BottomSheetScrollView>
                    ) : (
                        <BottomSheetView
                            style={styles.fixedContent}
                            onLayout={({ nativeEvent }) =>
                                logSheetDebug("content.layout", {
                                    label: debugLabel.current,
                                    ...nativeEvent.layout,
                                })
                            }
                        >
                            {options?.content}
                        </BottomSheetView>
                    )}
                </BottomSheetModal>
            </SheetContext.Provider>
        </BottomSheetModalProvider>
    );
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: COLORS.bgCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.gray600,
    },
    content: { flex: 1 },
    fixedContent: { flex: 1, bottom: 0 },
});
