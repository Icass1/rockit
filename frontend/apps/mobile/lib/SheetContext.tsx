import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetView,
    type BottomSheetBackdropProps,
    type BottomSheetModal as BottomSheetModalType,
} from "@gorhom/bottom-sheet";
import { StyleSheet } from "react-native";
import { COLORS } from "@/constants/theme";

export interface SheetOptions {
    content: ReactNode;
    snapPoints?: (string | number)[];
    scrollable?: boolean;
    onClose?: () => void;
}

interface SheetContextValue {
    open: (options: SheetOptions) => void;
    close: () => void;
}

const SheetContext = createContext<SheetContextValue>({
    open: () => {},
    close: () => {},
});

export function useSheet() {
    return useContext(SheetContext);
}

export function SheetProvider({ children }: { children: ReactNode }) {
    const sheetRef = useRef<BottomSheetModalType>(null);
    const isPresented = useRef(false);
    const closeCallback = useRef<(() => void) | undefined>(undefined);
    const [options, setOptions] = useState<SheetOptions | null>(null);

    const close = useCallback(() => {
        sheetRef.current?.dismiss();
    }, []);

    const open = useCallback((nextOptions: SheetOptions) => {
        closeCallback.current = nextOptions.onClose;
        setOptions(nextOptions);
        if (!isPresented.current) {
            isPresented.current = true;
            requestAnimationFrame(() => sheetRef.current?.present());
        }
    }, []);

    const handleDismiss = useCallback(() => {
        const callback = closeCallback.current;
        closeCallback.current = undefined;
        isPresented.current = false;
        setOptions(null);
        callback?.();
    }, []);

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
                    ref={sheetRef}
                    index={0}
                    snapPoints={options?.snapPoints ?? ["70%"]}
                    enablePanDownToClose
                    backdropComponent={renderBackdrop}
                    backgroundStyle={styles.background}
                    handleIndicatorStyle={styles.handle}
                    onDismiss={handleDismiss}
                >
                    {options?.scrollable ? (
                        <BottomSheetScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                        >
                            {options.content}
                        </BottomSheetScrollView>
                    ) : (
                        <BottomSheetView style={styles.content}>
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
});
