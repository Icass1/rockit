import { useEffect } from "react";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { Platform, StatusBar } from "react-native";
import { rockIt } from "@/lib/rockit/rockIt";

let fullscreenTransition = Promise.resolve();

/** Scope native orientation and system bars to the fullscreen player's lifetime. */
export function useVideoFullscreen(onClose: () => void): void {
    useEffect(() => {
        if (Platform.OS === "web") return;
        let disposed = false;
        const statusBar = StatusBar.pushStackEntry({
            hidden: true,
            animated: false,
        });
        let previousLock = ScreenOrientation.OrientationLock.PORTRAIT_UP;
        let previousNavigationVisibility:
            | Awaited<ReturnType<typeof NavigationBar.getVisibilityAsync>>
            | undefined;

        // Cleanup waits for entry to finish, so a quick exit cannot leave the app
        // in landscape or hide system bars after the player has closed.
        const entering = fullscreenTransition.then(async () => {
            try {
                previousLock =
                    await ScreenOrientation.getOrientationLockAsync();
                if (disposed) return;
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.LANDSCAPE
                );
                if (disposed) return;
                if (Platform.OS === "android") {
                    try {
                        previousNavigationVisibility =
                            await NavigationBar.getVisibilityAsync();
                        if (!disposed)
                            await NavigationBar.setVisibilityAsync("hidden");
                    } catch {
                        // Some Android window configurations do not expose navigation bars.
                    }
                }
            } catch {
                if (!disposed) {
                    rockIt.notificationManager.notifyError(
                        rockIt.vocabularyManager.vocabulary
                            .PLAYER_FULLSCREEN_UNAVAILABLE
                    );
                    onClose();
                }
            }
        });
        fullscreenTransition = entering;

        return () => {
            disposed = true;
            StatusBar.popStackEntry(statusBar);
            fullscreenTransition = fullscreenTransition.then(async () => {
                await ScreenOrientation.lockAsync(previousLock).catch(() => {});
                if (previousNavigationVisibility !== undefined) {
                    await NavigationBar.setVisibilityAsync(
                        previousNavigationVisibility
                    ).catch(() => {});
                }
            });
        };
    }, [onClose]);
}
