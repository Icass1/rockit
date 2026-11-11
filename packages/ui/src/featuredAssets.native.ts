import type { ImageSourcePropType } from "react-native";
import { featuredArtworkPath } from "./featuredArtworkPath";

const assets: Record<string, ImageSourcePropType> = {
    "/rockit-background.png": require("../assets/rockit-background.png"),
    "/recap-covers/january.png": require("../assets/recap-covers/january.png"),
    "/recap-covers/february.png": require("../assets/recap-covers/february.png"),
    "/recap-covers/march.png": require("../assets/recap-covers/march.png"),
    "/recap-covers/april.png": require("../assets/recap-covers/april.png"),
    "/recap-covers/may.png": require("../assets/recap-covers/may.png"),
    "/recap-covers/june.png": require("../assets/recap-covers/june.png"),
    "/recap-covers/july.png": require("../assets/recap-covers/july.png"),
    "/recap-covers/august.png": require("../assets/recap-covers/august.png"),
    "/recap-covers/september.png": require("../assets/recap-covers/september.png"),
    "/recap-covers/october.png": require("../assets/recap-covers/october.png"),
    "/recap-covers/november.png": require("../assets/recap-covers/november.png"),
    "/recap-covers/december.png": require("../assets/recap-covers/december.png"),
};
export const featuredArtworkSource = (kind: string) =>
    assets[featuredArtworkPath(kind)];
