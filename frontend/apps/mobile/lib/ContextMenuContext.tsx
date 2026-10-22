import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react-native";
import { useSheet } from "@/lib/SheetContext";
import { logSheetDebug } from "@/lib/sheetDebug";
import { ContextMenuSheetContent } from "@/components/ContextMenu/ContextMenuSheet";

export interface ContextMenuOption {
    label: string;
    icon: LucideIcon;
    onPress: () => void;
    destructive?: boolean;
    showArrow?: boolean;
}

export interface ContextMenuConfig {
    imageUrl?: string;
    title: string;
    subtitle?: string;
    options: ContextMenuOption[];
    backAction?: () => void;
}

interface ContextMenuContextType {
    show: (config: ContextMenuConfig) => void;
    hide: () => void;
    config: ContextMenuConfig | null;
    isOpen: boolean;
}

const ContextMenuContext = createContext<ContextMenuContextType>({
    show: () => {},
    hide: () => {},
    config: null,
    isOpen: false,
});

export function useContextMenu() {
    return useContext(ContextMenuContext);
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
    const { open: openSheet, close: closeSheet } = useSheet();
    const [config, setConfig] = useState<ContextMenuConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const show = useCallback(
        (newConfig: ContextMenuConfig) => {
            logSheetDebug("contextMenu.show", {
                optionCount: newConfig.options.length,
                hasImage: !!newConfig.imageUrl,
            });
            setConfig(newConfig);
            setIsOpen(true);
            openSheet({
                debugLabel: "context-menu",
                content: <ContextMenuSheetContent config={newConfig} />,
                snapPoints: ["85%"],
                scrollable: true,
                onClose: () => {
                    logSheetDebug("contextMenu.onClose");
                    setConfig(null);
                    setIsOpen(false);
                },
            });
        },
        [openSheet]
    );

    const hide = useCallback(() => {
        logSheetDebug("contextMenu.hide");
        closeSheet();
        setIsOpen(false);
        setConfig(null);
    }, [closeSheet]);

    return (
        <ContextMenuContext.Provider value={{ show, hide, config, isOpen }}>
            {children}
        </ContextMenuContext.Provider>
    );
}
