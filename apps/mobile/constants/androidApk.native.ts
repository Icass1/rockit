import { Platform } from "react-native";

const code = Number(process.env.EXPO_PUBLIC_ANDROID_APK_VERSION_CODE);

/** The APK workflow embeds the same code it writes into the Android manifest. */
export const installedAndroidApkCode =
    Platform.OS === "android" &&
    !__DEV__ &&
    Number.isSafeInteger(code) &&
    code > 1
        ? code
        : null;
