import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSheet } from "@/lib/SheetContext";

export interface ModalContent {
    title?: string;
    content?: ReactNode;
    style?: ViewStyle;
    onClose?: () => void;
}

interface ModalContextType {
    visible: boolean;
    content: ModalContent | null;
    show: (content: ModalContent) => void;
    hide: () => void;
}

const ModalContext = createContext<ModalContextType>({
    visible: false,
    content: null,
    show: () => {},
    hide: () => {},
});

let modalRef: ModalContextType = {
    visible: false,
    content: null,
    show: () => {},
    hide: () => {},
};

export function useModal() {
    const context = useContext(ModalContext);
    modalRef = context;
    return context;
}

export function getModalRef(): ModalContextType {
    return modalRef;
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const styles = useThemedStyles(createStyles);
    const { open, close } = useSheet();
    const [visible, setVisible] = useState(false);
    const [content, setContent] = useState<ModalContent | null>(null);

    const show = useCallback(
        (newContent: ModalContent) => {
            setContent(newContent);
            setVisible(true);
            open({
                debugLabel: "modal",
                snapPoints: ["48%"],
                content: (
                    <View style={[styles.card, newContent.style]}>
                        {newContent.title && (
                            <Text style={styles.title}>{newContent.title}</Text>
                        )}
                        {newContent.content}
                    </View>
                ),
                onClose: () => {
                    newContent.onClose?.();
                    setVisible(false);
                    setContent(null);
                },
            });
        },
        [open]
    );

    const hide = useCallback(() => {
        close();
        setVisible(false);
        setContent(null);
    }, [close]);

    return (
        <ModalContext.Provider value={{ visible, content, show, hide }}>
            {children}
        </ModalContext.Provider>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.legacy.bgCard,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.xxl,
            gap: theme.spacing.md,
        },
        title: {
            color: theme.legacy.white,
            fontSize: 20,
            fontWeight: "700",
            marginBottom: theme.spacing.xs,
        },
    });
