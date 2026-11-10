import type * as Native from "react-native";
import * as web from "react-native-web";

/** Both renderers implement this primitive contract; platform selection stays here. */
export const { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } =
    web as unknown as Pick<
        typeof Native,
        | "ActivityIndicator"
        | "Image"
        | "Pressable"
        | "StyleSheet"
        | "Text"
        | "View"
    >;
