import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { syncManager } from "@/lib/syncManager";

void SplashScreen.preventAutoHideAsync();

export async function initializePlatform(): Promise<void> {
    await mediaStorage.init();
    await syncManager.init();
    await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
    ).catch(() => {});
}

export async function hideSplash(): Promise<void> {
    await SplashScreen.hideAsync();
}
