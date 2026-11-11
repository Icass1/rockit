import { launchImageLibraryAsync } from "expo-image-picker";
import type { ProfilePhotoResult } from "@/models/interfaces/profilePhoto";

export async function pickProfilePhoto(): Promise<ProfilePhotoResult> {
    // Launch before awaiting anything else: Safari requires the user's gesture.
    const result = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
    });
    if (result.canceled) return { status: "cancelled" };
    const asset = result.assets[0];
    const file = asset.file ?? (await (await fetch(asset.uri)).blob());
    if (
        !file.size ||
        file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
        return { status: "invalid" };
    return {
        status: "selected",
        file,
        filename: asset.fileName ?? "profile.jpg",
    };
}
