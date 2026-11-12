import { useMemo, type ReactNode } from "react";
import { useDesignTheme } from "@rockit/ui";
import { PanResponder, View } from "react-native";

export default function QueueDragHandle({
    label,
    onStart,
    onMove,
    onEnd,
    children,
}: {
    label: string;
    onStart: () => void;
    onMove: (dy: number, y: number) => void;
    onEnd: (dy: number) => void;
    children: ReactNode;
}) {
    const theme = useDesignTheme();
    const responder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: onStart,
                onPanResponderMove: (_, g) => onMove(g.dy, g.moveY),
                onPanResponderRelease: (_, g) => onEnd(g.dy),
                onPanResponderTerminate: () => onEnd(0),
                onPanResponderTerminationRequest: () => false,
            }),
        [onStart, onMove, onEnd]
    );
    return (
        <View
            {...responder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityActions={[
                { name: "increment" },
                { name: "decrement" },
            ]}
            onAccessibilityAction={(e) => {
                onStart();
                onEnd(
                    e.nativeEvent.actionName === "increment"
                        ? theme.layout.queueRowHeight
                        : -theme.layout.queueRowHeight
                );
            }}
            style={{
                width: theme.layout.touchTarget,
                height: theme.layout.touchTarget,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {children}
        </View>
    );
}
