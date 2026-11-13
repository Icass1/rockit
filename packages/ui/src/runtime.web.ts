import type * as Native from "react-native";
import * as web from "react-native-web";

/** Both renderers implement this primitive contract; platform selection stays here. */
export const {
    AccessibilityInfo,
    AppState,
    Animated,
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} = web as unknown as Pick<
    typeof Native,
    | "AccessibilityInfo"
    | "AppState"
    | "Animated"
    | "ActivityIndicator"
    | "Image"
    | "Pressable"
    | "ScrollView"
    | "StyleSheet"
    | "Text"
    | "View"
>;

export const nativeAnimations = false;
