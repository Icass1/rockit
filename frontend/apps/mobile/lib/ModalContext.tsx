import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { COLORS } from "@/constants/theme";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    type ViewStyle,
} from "react-native";

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
    const [visible, setVisible] = useState(false);
    const [content, setContent] = useState<ModalContent | null>(null);

    const show = useCallback((newContent: ModalContent) => {
        setContent(newContent);
        setVisible(true);
    }, []);

    const hide = useCallback(() => {
        setVisible(false);
        setContent(null);
    }, []);

    return (
        <ModalContext.Provider value={{ visible, content, show, hide }}>
            {children}
            <GlobalModal visible={visible} content={content} onDismiss={hide} />
        </ModalContext.Provider>
    );
}

interface GlobalModalProps {
    visible: boolean;
    content: ModalContent | null;
    onDismiss: () => void;
}

function GlobalModal({ visible, content, onDismiss }: GlobalModalProps) {
    if (!visible || !content) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <Pressable style={styles.overlay} onPress={onDismiss}>
                <Pressable
                    style={styles.card}
                    onPress={(e) => e.stopPropagation()}
                >
                    {content.title && (
                        <Text style={styles.title}>{content.title}</Text>
                    )}
                    {content.content && (
                        <View style={content.style}>{content.content}</View>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 360,
        minWidth: 280,
        gap: 12,
    },
    title: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 4,
    },
});
