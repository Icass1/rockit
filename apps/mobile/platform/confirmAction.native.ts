import { Alert } from "react-native";

export function confirmAction(
    title: string,
    message: string,
    accept: string,
    cancel: string
): Promise<boolean> {
    return new Promise((resolve) =>
        Alert.alert(
            title,
            message,
            [
                {
                    text: cancel,
                    style: "cancel",
                    onPress: () => resolve(false),
                },
                {
                    text: accept,
                    style: "destructive",
                    onPress: () => resolve(true),
                },
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
        )
    );
}
