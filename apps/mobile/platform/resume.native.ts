import { AppState } from "react-native";

export function subscribeToResume(listener: () => void): () => void {
    const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") listener();
    });
    return () => subscription.remove();
}
