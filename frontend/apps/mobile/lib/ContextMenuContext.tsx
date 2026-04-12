import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import ContextMenuSheet from "@/components/ContextMenu/ContextMenuSheet";

export interface ContextMenuOption {
    label: string;
    icon: string; // Feather icon name
    onPress: () => void;
    destructive?: boolean;
}

export interface ContextMenuConfig {
    imageUrl?: string;
    title: string;
    subtitle?: string;
    options: ContextMenuOption[];
    /** If provided, a back arrow is shown in the header that calls this */
    backAction?: () => void;
}

interface ContextMenuContextType {
    show: (config: ContextMenuConfig) => void;
    hide: () => void;
    config: ContextMenuConfig | null;
    sheetRef: React.RefObject<BottomSheetModal | null>;
}

const ContextMenuContext = createContext<ContextMenuContextType>({
    show: () => {},
    hide: () => {},
    config: null,
    sheetRef: { current: null },
});

export function useContextMenu() {
    return useContext(ContextMenuContext);
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [config, setConfig] = useState<ContextMenuConfig | null>(null);

    const show = useCallback((newConfig: ContextMenuConfig) => {
        setConfig(newConfig);
        setTimeout(() => sheetRef.current?.present(), 0);
    }, []);

    const hide = useCallback(() => {
        sheetRef.current?.dismiss();
    }, []);

    return (
        <ContextMenuContext.Provider value={{ show, hide, config, sheetRef }}>
            {children}
            <ContextMenuSheet />
        </ContextMenuContext.Provider>
    );
}
