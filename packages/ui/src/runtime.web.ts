import type * as Native from "react-native";
import * as web from "react-native-web";

/** Both renderers implement this primitive contract; platform selection stays here. */
export const {
    AccessibilityInfo,
    Animated,
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} = web as unknown as Pick<
    typeof Native,
    | "AccessibilityInfo"
    | "Animated"
    | "ActivityIndicator"
    | "Image"
    | "Pressable"
    | "StyleSheet"
    | "Text"
    | "View"
>;

export const nativeAnimations = false;
